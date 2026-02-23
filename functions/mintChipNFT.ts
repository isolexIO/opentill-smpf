import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from 'npm:@solana/web3.js@1.95.8';
import { 
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID 
} from 'npm:@metaplex-foundation/mpl-token-metadata@3.2.1';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from 'npm:@solana/spl-token@0.3.9';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chip_id, wallet_address } = await req.json();

    if (!chip_id || !wallet_address) {
      return Response.json({ 
        success: false, 
        error: 'chip_id and wallet_address are required' 
      }, { status: 400 });
    }

    // Load chip details
    const chips = await base44.asServiceRole.entities.Chip.filter({ id: chip_id });
    if (chips.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Chip not found' 
      }, { status: 404 });
    }

    const chip = chips[0];

    // Check supply limits
    if (chip.total_supply && chip.mints_count >= chip.total_supply) {
      return Response.json({ 
        success: false, 
        error: 'Chip is sold out' 
      }, { status: 400 });
    }

    // Check max per wallet
    const existingMints = await base44.asServiceRole.entities.ChipMint.filter({
      chip_id,
      wallet_address
    });

    if (chip.max_per_wallet && existingMints.length >= chip.max_per_wallet) {
      return Response.json({ 
        success: false, 
        error: `Maximum ${chip.max_per_wallet} per wallet` 
      }, { status: 400 });
    }

    // Connect to Solana
    const network = Deno.env.get('SOLANA_NETWORK') || 'devnet';
    const rpcUrl = network === 'mainnet' 
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';
    
    const connection = new Connection(rpcUrl, 'confirmed');

    // Generate new mint keypair for this NFT
    const mintKeypair = Keypair.generate();
    const userPublicKey = new PublicKey(wallet_address);

    // Authority keypair (should be stored securely)
    const authoritySecretKey = Deno.env.get('SOLANA_AUTHORITY_PRIVATE_KEY');
    if (!authoritySecretKey) {
      return Response.json({ 
        success: false, 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    const authorityKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(authoritySecretKey))
    );

    // Create mint account
    const mint = await createMint(
      connection,
      authorityKeypair,
      authorityKeypair.publicKey,
      null,
      0, // 0 decimals for NFT
      mintKeypair
    );

    // Get or create associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      authorityKeypair,
      mint,
      userPublicKey
    );

    // Mint 1 token to user
    await mintTo(
      connection,
      authorityKeypair,
      mint,
      tokenAccount.address,
      authorityKeypair.publicKey,
      1
    );

    // Create metadata
    const metadataUri = chip.metadata_uri || `https://arweave.net/${chip.id}`;
    
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer()
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const metadataInstruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: authorityKeypair.publicKey,
        payer: authorityKeypair.publicKey,
        updateAuthority: authorityKeypair.publicKey
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: chip.name,
            symbol: chip.symbol || 'CHIP',
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: chip.collection_address ? {
              verified: false,
              key: new PublicKey(chip.collection_address)
            } : null,
            uses: null
          },
          isMutable: true,
          collectionDetails: null
        }
      }
    );

    const transaction = new Transaction().add(metadataInstruction);
    const signature = await connection.sendTransaction(transaction, [authorityKeypair]);
    await connection.confirmTransaction(signature);

    // Record mint in database
    const mintRecord = await base44.asServiceRole.entities.ChipMint.create({
      chip_id,
      wallet_address,
      user_id: user.id,
      merchant_id: user.merchant_id,
      ambassador_id: user.ambassador_id,
      tx_signature: signature,
      nft_mint_address: mint.toBase58(),
      price_paid_duc: chip.price_duc || 0,
      minted_at: new Date().toISOString()
    });

    // Update chip mints count
    await base44.asServiceRole.entities.Chip.update(chip_id, {
      mints_count: (chip.mints_count || 0) + 1
    });

    // Create motherboard install
    const ownerType = user.merchant_id ? 'merchant' : 'ambassador';
    const ownerId = user.merchant_id || user.ambassador_id;

    if (ownerId) {
      await base44.asServiceRole.entities.MotherboardInstall.create({
        owner_type: ownerType,
        owner_id: ownerId,
        chip_id,
        wallet_address,
        installed_at: new Date().toISOString(),
        is_active: true
      });
    }

    return Response.json({
      success: true,
      mint_address: mint.toBase58(),
      signature,
      token_account: tokenAccount.address.toBase58(),
      message: 'NFT minted successfully!'
    });

  } catch (error) {
    console.error('Mint error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});