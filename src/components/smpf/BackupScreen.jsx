// Inside BackupScreen.jsx - Update the handleDownload and handleVerify functions

const handleDownloadBackup = () => {
  if (!passphrase || passphrase.length < 8) {
    setError('Password must be at least 8 characters.');
    return;
  }

  try {
    // Ensure both address and publicKey attributes are explicitly set
    const walletAddress = sessionKeypair?.address || sessionKeypair?.publicKey || localStorage.getItem(`smpf_pubkey_${currentUserEmail}`);
    const rawSecretKey = sessionKeypair?.privateKeyBs58 || sessionKeypair?.secretKey;

    const backupPayload = {
      version: '1.0',
      address: walletAddress,
      publicKey: walletAddress,
      secretKey: rawSecretKey,
      createdAt: new Date().toISOString()
    };

    // Download JSON backup
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `opentill-smpf-wallet-${walletAddress?.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupDownloaded(true);
  } catch (err) {
    setError('Failed to generate backup file: ' + err.message);
  }
};

const handleFileVerify = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      
      // Check for valid address in either 'address' or 'publicKey' fields
      const targetAddress = parsed.address || parsed.publicKey;

      if (!targetAddress || typeof targetAddress !== 'string' || targetAddress.length < 32) {
        setVerifyError('Verification failed: Backup does not contain a valid SMPF address.');
        setVerified(false);
        return;
      }

      setVerifyError('');
      setVerified(true);
    } catch (err) {
      setVerifyError('Invalid JSON backup file.');
      setVerified(false);
    }
  };
  reader.readAsText(file);
};