import {
  Zap, CreditCard, Package, Users, Settings, BarChart3, Globe, Smartphone,
  HelpCircle, ShoppingBag, Shield, Monitor, TrendingUp, FileText, Wallet,
  Crown, Link2, DollarSign, Truck, Terminal, Cpu, Layers, Activity,
  Store, Lightbulb, UserPlus, Sparkles
} from 'lucide-react';

export const userManualSections = [
  {
    id: 'getting-started',
    icon: Zap,
    title: 'Getting Started',
    color: 'text-blue-600',
    content: [
      {
        title: 'Welcome to openTILL POS',
        content: 'openTILL is a modern point of sale system with blockchain integration. The core POS is completely free — you pay only for premium chip-based features you choose. Access your dashboard at the System Menu to view stats, pending orders, low stock alerts, and quick access to all features.'
      },
      {
        title: 'First Time Setup',
        content: '1. Complete merchant onboarding at opentill-pos.com\n2. Super Admin approves your account and activates your account\n3. Login with your email and password\n4. Navigate to Settings → General to configure your business profile\n5. Add products via System Menu → Products\n6. Configure payment gateways in Settings → Payment Gateways\n7. Add staff members in Settings → Staff Management\n8. Run a test transaction to verify everything works'
      },
      {
        title: 'Logging In',
        content: 'There are multiple ways to log in:\n• PIN Login - Quick 4-digit PIN for staff clock-in at the register\n• Email Login - Full merchant account access with email/password\n• Wallet Login - Connect Solana wallets (Phantom, Solflare) for Web3 authentication\n\nOnce logged in, you will see the System Menu with access to all features.'
      },
      {
        title: 'System Menu Navigation',
        content: 'The System Menu is your central hub, organized into categories:\n\nSelling:\n• POS - Process customer orders\n• Orders - View order history\n• Invoices - Send paylinks to customers\n• Delivery Dashboard - Driver jobs & deliveries\n\nCatalog:\n• Products - Manage catalog and inventory\n• Departments - Organize products\n• Modifiers - Grouped options & add-ons\n• Inventory - Stock management\n\nCustomers & Online Ordering:\n• Customers - Customer database and loyalty\n• Loyalty Program - Rewards and points\n• Online Menu - Public ordering page\n• Online Orders - Manage web/app orders\n\nPayments & Rewards:\n• openTILL Payments - Stripe dashboard, connection & terminal\n• $DUC Vault - Rewards, staking & swaps\n• SMPF Wallet - Your $DUC & Solana wallet\n• Referral Program - Refer merchants and earn rewards\n\nInsights & Growth:\n• Reports - Sales analytics\n• AI Assistant - Business insights & analysis\n• AI Website Generator - Generate a website with AI\n\nPlatform & Admin:\n• Marketplace - Browse and purchase chips\n• Motherboard - Install and manage chips\n• Employees - Staff management\n• Device Monitor - Track active sessions\n• Settings - System configuration\n• Super Admin / Dealer Dashboard - (admin only)\n• Support - Help and documentation'
      }
    ]
  },
  {
    id: 'pos-operations',
    icon: CreditCard,
    title: 'POS Operations',
    color: 'text-green-600',
    content: [
      {
        title: 'Processing Orders - Complete Workflow',
        content: 'STEP 1: Access the POS\n• From System Menu, click "POS"\n• Interface loads with departments and products\n\nSTEP 2: Select Products\n• Click department tabs to filter products\n• Click product cards to add to cart\n• Or scan barcodes with connected scanner\n• Use "Open Item" button for custom items\n\nSTEP 3: Manage Cart\n• Adjust quantities with +/- buttons\n• Remove items with trash icon\n• Click items to add modifiers (sizes, toppings)\n• View real-time totals\n\nSTEP 4: Age Verification (if required)\n• System detects age-restricted items\n• Scan ID or manually verify age\n• Enter verification details\n• Cannot proceed without verification\n\nSTEP 5: Apply Discounts\n• Click "Apply Discount" button\n• Enter percentage (%) or dollar amount ($)\n• Discount applies to subtotal\n\nSTEP 6: Select Customer (Optional)\n• Click "Select Customer" button\n• Search by name, phone, or email\n• Customer info and loyalty points displayed\n• Points auto-applied if eligible\n\nSTEP 7: Send to Kitchen\n• Click "Send to Kitchen" for restaurants\n• Order appears on Kitchen Display\n• Staff can track preparation status\n\nSTEP 8: Proceed to Payment\n• Review order total (shows dual pricing if enabled)\n• Click "Pay" button\n• Choose payment method (Cash, Card, EBT, Crypto, Split)\n• Process payment\n• Print/email receipt\n• Send to Customer Display (optional)'
      },
      {
        title: 'Payment Methods',
        content: 'openTILL supports multiple payment types:\n\n• Cash - Manual cash transactions with change calculation\n• Card - Credit/Debit via Stripe, Square, or other gateways\n• EBT/SNAP - For eligible food items only (auto-calculates eligible items)\n• Solana Pay - Cryptocurrency via QR code (USDC or custom tokens)\n• Split Payment - Combine multiple methods (e.g., EBT + Card for non-eligible items)\n\nAll transactions are recorded in Order History with full details.'
      },
      {
        title: 'Dual Pricing & Surcharges',
        content: 'Display cash and non-cash prices:\n• Cash Price - Base price for cash/EBT payments\n• Non-Cash Price - Includes surcharge for card payments\n\nConfiguration:\n• Enable in Settings → Pricing & Surcharge\n• Set surcharge percentage (e.g., 3.5%)\n• Choose pricing mode (surcharge or cash discount)\n• Select region (US, CA, Other)\n• Option to show both prices on display\n• Option to sync surcharge with openTILL Payments processing rate\n\nPOS automatically calculates and applies correct pricing based on selected payment method.'
      },
      {
        title: 'Age Verification',
        content: 'Required for restricted items:\n1. Mark products as "Age Restricted" in product settings\n2. Set minimum age (18 or 21)\n3. When item added to cart, verification prompt appears\n4. Options: Scan ID, Manual Entry, Visual Check\n5. Enter ID last 4 digits for audit trail\n6. System records who verified and when\n7. Cannot complete order without verification\n\nVerification data stored in order history for compliance.'
      },
      {
        title: 'Open Items',
        content: 'Create custom items on-the-fly:\n1. Click "Open Item" button on POS\n2. Enter item name and price\n3. Toggle options:\n   • EBT Eligible (for food items)\n   • Age Restricted (for alcohol/tobacco)\n   • Tippable (allow tips)\n4. Add to cart\n5. Item saved for current order only (not added to catalog)'
      },
      {
        title: 'Product Modifiers',
        content: 'Add customization options:\n• Configure in System Menu → Modifiers (dedicated page)\n• Create modifier groups (Size, Toppings, Extras)\n• Set price adjustments (+$1.50, -$0.50)\n• Choose selection type (single = radio, multi = checkboxes)\n• Set min/max selections required\n• Apply to all products or specific products/departments\n\nOn POS:\n• Click item in cart to add modifiers\n• Select from configured options\n• Price updates automatically\n• Modifiers show on receipt and kitchen display\n\nSee the "Modifiers" section for full setup details.'
      },
      {
        title: 'Customer Display Integration',
        content: 'Show order to customers in real-time:\n1. Open customer display URL on secondary screen/tablet\n2. Display shows:\n   • Items added to cart\n   • Prices and totals\n   • Dual pricing if enabled\n   • Payment method selection\n   • Tip screen\n   • Transaction status\n3. Updates automatically as cashier works\n4. Branded with your logo and colors\n\nGet URL from Settings → Customer Display or use Station-based mobile display.'
      },
      {
        title: 'Kitchen Display System',
        content: 'Send orders to kitchen:\n1. Open kitchen display URL on kitchen screen\n2. Click "Send to Kitchen" button on POS\n3. Order appears on kitchen display with:\n   • Order number and time\n   • Items and quantities\n   • Modifiers and special instructions\n   • Color-coded by status\n4. Kitchen staff clicks items to mark as prepared\n5. Auto-advances to next order when complete\n\nConfigure in Settings → Kitchen Display'
      }
    ]
  },
  {
    id: 'products-inventory',
    icon: Package,
    title: 'Products & Inventory',
    color: 'text-purple-600',
    content: [
      {
        title: 'Adding Products - Step by Step',
        content: 'STEP 1: Navigate to Products\n• From System Menu, click "Products"\n• View existing catalog\n\nSTEP 2: Create New Product\n• Click "+ Add Product" button\n• Product form appears\n\nSTEP 3: Basic Information (Required)\n• Product Name - Display name\n• Price - Base price before tax\n• Department - Select from dropdown\n\nSTEP 4: Optional Details\n• SKU - Stock keeping unit for tracking\n• Barcode - For scanner lookup\n• Description - Shows on online menu and receipts\n\nSTEP 5: Upload Image\n• Click "Upload Image" or drag & drop\n• Recommended: 800x800px, JPG/PNG\n• Image shows on POS and online menu\n\nSTEP 6: Configure Options\n• EBT Eligible - Food items qualifying for SNAP\n• Age Restricted - Alcohol, tobacco, vape products\n• Tippable - Allow tips for this item\n• Set minimum age if restricted (18 or 21)\n\nSTEP 7: Inventory Settings\n• Current stock quantity\n• Low stock alert threshold\n• System alerts when below threshold\n\nSTEP 8: Add Modifiers\n• Click "Add Modifier Group" or configure in Modifiers page\n• Example: "Size" with options Small/Medium/Large\n• Set price adjustments for each option\n• Multiple modifier groups allowed\n\nSTEP 9: Save\n• Click "Save Product"\n• Product now available on POS\n• Appears in department filter'
      },
      {
        title: 'Barcode Scanner & Product Lookup',
        content: 'Smart product database integration:\n1. Connect barcode scanner (USB or Bluetooth)\n2. On POS or Products page, scan barcode\n3. System searches:\n   • Your existing catalog first\n   • Then external databases (Open Food Facts, UPC Item DB)\n4. If found externally:\n   • Name, description, and image auto-filled\n   • You can adjust details\n   • Click "Save" to add to catalog\n5. If not found:\n   • Create manually with "Product Not Found" dialog\n\nSupported formats: UPC, EAN, Code 39, Code 128'
      },
      {
        title: 'Departments',
        content: 'Organize products by category:\n• Navigate to Departments page\n• Create departments with custom:\n  - Name (Food, Drinks, Retail, etc.)\n  - Color (for visual identification)\n  - Icon from Lucide library\n  - Display order\n• Assign products to departments\n• Filter POS by department tabs\n• Department-based reporting\n\nCommon departments:\n- Food & Beverages\n- Retail Products\n- Services\n- Alcohol & Tobacco\n- Health & Beauty'
      },
      {
        title: 'Modifiers (Modifier Groups)',
        content: `Create customizable options for your products:
Access: System Menu → Modifiers

Creating a Modifier Group:
1. Click "Create Modifier Group"
2. Enter group name (e.g., "Size", "Toppings", "Milk Options")
3. Add optional description
4. Choose selection type:
   • Single - Pick one option (radio buttons)
   • Multi - Pick multiple options (checkboxes)
5. Set requirements:
   • Min Required - Minimum selections customer must make
   • Max Allowed - Maximum selections (0 = unlimited)
6. Set sort order for display

Adding Options:
1. Within a group, click "Add Option"
2. Enter option name (e.g., "Large", "Extra Cheese")
3. Set price adjustment (e.g., +$1.50, -$0.50, or $0.00)
4. Mark as default (pre-selected for customer)
5. Set sort order

Applying to Products:
• Apply to ALL products (toggle on)
• OR apply to specific products (select from list)
• OR apply to specific departments (select from list)
• Multiple groups can apply to the same product

On the POS:
• Tap an item in the cart to open modifier selection
• Customer/staff selects from configured options
• Price adjusts automatically based on selections
• Modifiers appear on receipt and kitchen tickets

Examples:
• Size: Small ($0), Medium (+$1.00), Large (+$2.00)
• Toppings: Extra Cheese (+$0.75), Bacon (+$1.50)
• Milk: Whole, Skim, Oat (+$0.50), Almond (+$0.50)`
      },
      {
        title: 'Inventory Management',
        content: 'Track stock levels:\n1. Set initial quantity when adding product\n2. POS automatically deducts from inventory on sale\n3. Receive low stock alerts (email/dashboard)\n4. Navigate to Inventory page to:\n   • View current levels\n   • Manual restock entries\n   • View inventory history\n   • See reorder suggestions\n5. Export inventory reports to CSV\n6. Set reorder thresholds per product\n\nInventory tracked in real-time across all POS terminals.'
      },
      {
        title: 'Bulk Product Management',
        content: 'Manage multiple products at once:\n• Select multiple products with checkboxes\n• Available actions:\n  - Bulk assign to department\n  - Bulk price update (%, $, or set value)\n  - Bulk enable/disable\n  - Bulk delete\n  - Export selected to CSV\n• CSV Import:\n  - Download template\n  - Fill with product data\n  - Upload to create/update in bulk\n  - System validates and imports'
      },
      {
        title: 'Product Images & Media',
        content: 'Visual product catalog:\n• Upload product photos (JPG, PNG)\n• Recommended size: 800x800px square\n• Images display on:\n  - POS product grid\n  - Online menu\n  - Customer display\n  - Receipts (if enabled)\n• Multiple images per product (future feature)\n• Image optimization automatic\n• CDN delivery for fast loading'
      }
    ]
  },
  {
    id: 'customers',
    icon: Users,
    title: 'Customer Management',
    color: 'text-pink-600',
    content: [
      {
        title: 'Customer Database',
        content: 'Store customer information:\n• Navigate to Customers page\n• Click "Add Customer" for new customer\n• Enter details:\n  - Full name (required)\n  - Email address\n  - Phone number\n  - Preferred payment method\n  - Custom notes\n• System automatically tracks:\n  - Total spent (lifetime value)\n  - Visit count\n  - Loyalty points balance\n  - $DUC token balance (crypto rewards)\n  - Last visit date\n• Search customers by name, email, or phone\n• Edit or delete customer records'
      },
      {
        title: 'Loyalty Program',
        content: 'Reward repeat customers:\n1. Enable in Settings → Loyalty Program\n2. Configure:\n   • Points per dollar spent\n   • Dollar value per point\n   • Minimum redemption amount\n3. Customers earn automatically:\n   • Points calculated on each purchase\n   • Shown on receipt\n4. Redeem points:\n   • Select customer on POS\n   • Points available as discount\n   • Deducted from balance\n5. Track in Reports:\n   • Points issued\n   • Points redeemed\n   • Customer loyalty rankings\n\nCustomers can also earn $DUC tokens (crypto rewards) via merchant loyalty programs.'
      },
      {
        title: 'Customer Lookup on POS',
        content: 'Quick customer search during checkout:\n1. Click "Select Customer" button on POS\n2. Search by:\n   • Name\n   • Phone number\n   • Email address\n3. Customer profile displays:\n   • Contact info\n   • Loyalty points balance\n   • $DUC token balance\n   • Total purchases\n   • Last visit\n4. Select to apply to current order\n5. Loyalty points auto-calculated\n6. Customer info printed on receipt'
      },
      {
        title: 'Customer Portal',
        content: `Customer-facing self-service portal:
Access: Customers can access via the "Customer Portal" link at the bottom of the app.

Features for customers:
• View loyalty points balance and $DUC token balance
• View order history
• Update profile information
• View and pay outstanding invoices
• Submit support requests

How customers access:
• A "Customer Portal" link appears at the bottom of every page
• Customers authenticate with their email and PIN
• PIN is set up by the merchant when creating the customer record
• Customers see only their own data

Merchants manage customer portal access:
• Set customer PIN from the Customers page
• Customer must have an email on file
• Portal access can be enabled/disabled per customer`
      },
      {
        title: 'Customer Display',
        content: 'Customer-facing screen:\n• Set up secondary display (tablet, monitor)\n• Open customer display URL\n• Shows real-time:\n  - Welcome screen with logo\n  - Items being added to cart\n  - Prices and totals\n  - Payment method selection\n  - Tip screen (if enabled)\n  - Transaction status\n  - Thank you message\n• Fully branded with your colors\n• Touch-enabled for customer input\n• Get URL from Settings → Customer Display\n• Or use Station-based Mobile Display (see Mobile Station Display section)'
      }
    ]
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payment Processing',
    color: 'text-indigo-600',
    content: [
      {
        title: 'Payment Gateway Setup - Stripe',
        content: 'STEP 1: Get Stripe Account\n• Sign up at stripe.com\n• Complete business verification\n• Navigate to Developers → API Keys\n\nSTEP 2: Get API Credentials\n• Copy "Publishable key" (starts with pk_)\n• Copy "Secret key" (starts with sk_)\n• Use test keys for testing, live keys for production\n\nSTEP 3: Configure in openTILL\n• Settings → Payment Gateways → Stripe\n• Paste Publishable Key\n• Paste Secret Key\n• Select Test Mode or Live Mode\n\nSTEP 4: Test Connection\n• Click "Test Connection" button\n• Green checkmark = success\n• Red X = recheck keys\n\nSTEP 5: Enable\n• Toggle "Enabled" switch\n• Save settings\n• Stripe now active for card payments\n\nSTEP 6: Test Transaction\n• Process small test order\n• Use Stripe test card: 4242 4242 4242 4242\n• Verify transaction in Stripe dashboard'
      },
      {
        title: 'Payment Gateway Setup - Square',
        content: 'STEP 1: Get Square Account\n• Sign up at squareup.com\n• Complete business setup\n• Navigate to Developer Dashboard\n\nSTEP 2: Create Application\n• Create new application\n• Get Access Token\n• Get Location ID (from Locations)\n\nSTEP 3: Configure in openTILL\n• Settings → Payment Gateways → Square\n• Paste Access Token\n• Paste Location ID\n• Select Sandbox or Production\n\nSTEP 4: Test & Enable\n• Test connection\n• Enable gateway\n• Square hardware auto-syncs'
      },
      {
        title: 'EBT/SNAP Payment Processing',
        content: 'Accept food assistance payments:\n1. Mark products as "EBT Eligible" in product settings\n2. When customer adds items to cart:\n   • System auto-calculates EBT eligible total\n   • Shows eligible vs non-eligible amounts\n3. At checkout:\n   • Select "EBT" payment method\n   • Only eligible items charged to EBT\n   • Prompt for non-eligible items payment\n4. Record EBT approval code\n5. Print receipt showing breakdown\n\nCompliance:\n• Only food items eligible (no alcohol, tobacco, prepared foods)\n• Tips and fees cannot be paid with EBT\n• Detailed reporting for audits'
      },
      {
        title: 'Cryptocurrency Payments - Solana Pay',
        content: 'Accept crypto payments:\n\nSTEP 1: Enable Solana Pay\n• Settings → Solana Pay\n• Toggle "Enable"\n\nSTEP 2: Configure\n• Select Network (Mainnet or Devnet)\n• Enter your Solana wallet address\n• Choose accepted token:\n  - USDC (recommended)\n  - Custom SPL token\n• For custom token: Enter mint address, symbol, decimals\n\nSTEP 3: Display Options\n• Toggle "Display in Customer Terminal"\n• Configure QR code size and styling\n\nSTEP 4: Processing Payment\n1. Customer selects Solana Pay on POS\n2. System generates QR code\n3. Amount auto-converted to crypto\n4. Customer scans with mobile wallet\n5. Transaction confirmed on blockchain\n6. Receipt includes transaction signature\n\nSupported wallets: Phantom, Solflare, Glow, Slope'
      },
      {
        title: 'Split Payments',
        content: 'Accept multiple payment methods:\n1. Start checkout as normal\n2. Select "Split Payment"\n3. Choose first method and enter amount\n4. Process first payment\n5. System shows remaining balance\n6. Select second method\n7. Process remaining amount\n\nCommon scenarios:\n• EBT + Card (non-eligible items)\n• Gift Card + Cash\n• Crypto + Card\n• Multiple cards\n\nAll methods recorded separately in order history.'
      },
      {
        title: 'Tips & Gratuity',
        content: 'Enable tipping:\n1. Settings → General → Enable Tips\n2. Set default tip percentages (15%, 18%, 20%)\n3. Choose tip prompt location:\n   • Before payment\n   • On customer display\n   • On card terminal\n4. Customer selects tip amount\n5. Tips added to total\n6. Tip tracking in reports:\n   • Tips by employee\n   • Tips by payment method\n   • Total tip revenue\n\nNote: Tips cannot be paid with EBT/SNAP.'
      },
      {
        title: 'Refunds & Returns',
        content: 'Process refunds:\n1. Navigate to Orders page\n2. Search for order by number or date\n3. Click order to view details\n4. Click "Refund" button\n5. Select:\n   • Full refund (entire order)\n   • Partial refund (select items)\n6. Enter reason (optional)\n7. Click "Process Refund"\n8. Refund processed through original payment gateway\n9. Customer receives confirmation\n10. Refund appears in reports\n\nRefund timeline:\n• Card: 5-10 business days\n• Cash: Immediate\n• Crypto: Immediate (manual process)'
      }
    ]
  },
  {
    id: 'opentill-payments',
    icon: CreditCard,
    title: 'openTILL Payments (Powered by Stripe)',
    color: 'text-indigo-600',
    content: [
      {
        title: 'What is openTILL Payments?',
        content: `openTILL Payments is our managed card-payment offering, powered by Stripe:
• No need to create or manage your own Stripe account
• openTILL handles onboarding, underwriting, and payouts via Stripe Connect
• Accept credit and debit cards at the register, online, and via paylinks
• Funds settle to your bank account on Stripe's standard schedule
• PCI-DSS compliance handled by Stripe
• Includes Stripe Terminal integration for card-present payments

Enable it in Settings → Wallet & Payments by toggling "openTILL Payments" and completing the guided Stripe Connect onboarding.

Access the openTILL Payments dashboard from System Menu → openTILL Payments to view connection status, Stripe dashboard link, and terminal management.

Best for merchants who want card acceptance live quickly without managing their own gateway keys.`
      },
      {
        title: 'Getting Set Up',
        content: `Onboarding flow:
1. Settings → Wallet & Payments → enable openTILL Payments
2. Click "Connect with Stripe"
3. Complete the Stripe Connect Express onboarding (business info, bank account, KYC)
4. Stripe reviews and activates your account
5. Card payments are enabled automatically across POS, online ordering, and invoices
6. Payouts go to your linked bank account on Stripe's schedule (usually 2 business days)

Check connection status and refresh onboarding from the same settings page or the openTILL Payments dashboard at any time.`
      },
      {
        title: 'Stripe Terminal (Card-Present)',
        content: `Accept in-person card payments with Stripe Terminal:
1. System Menu → openTILL Payments → Terminal tab
2. Register your Stripe Terminal reader
3. Pair via Bluetooth or USB
4. Process card-present transactions directly from POS
5. Lower card-present rates vs. card-not-present

Supported readers:
• Stripe Reader (BBPOS WisePad)
• Stripe Terminal (BBPOS WisePOS E)
• Verifone P400

Note: Tap to Pay on iPhone/Android is not available in the web-based POS. Use a physical Stripe Terminal reader for contactless payments.`
      },
      {
        title: 'Pricing & Payouts',
        content: `How costs work:
• Card processing fees are set by openTILL (per your plan; typically 2.7% + $0.30)
• Surcharges / dual pricing apply the same as with any card gateway
• Payouts are deposited by Stripe to your bank account
• Transaction and payout history visible in your dashboard
• Super Admins can configure platform-level rates and view aggregate volume
• Option to sync dual-pricing surcharge with your actual openTILL Payments processing rate

Note: openTILL Payments is optional — you can still connect your own Stripe, Square, or crypto gateways instead.`
      }
    ]
  },
  {
    id: 'reports',
    icon: BarChart3,
    title: 'Reports & Analytics',
    color: 'text-orange-600',
    content: [
      {
        title: 'Sales Reports',
        content: 'Comprehensive sales analytics:\n• Navigate to Reports page\n• Select "Sales Reports" tab\n• Choose date range (today, week, month, custom)\n• View metrics:\n  - Total revenue\n  - Number of orders\n  - Average order value\n  - Sales by product\n  - Sales by department\n  - Sales by payment method\n  - Sales by hour/day\n  - Top selling items\n• Visual charts and graphs\n• Export to CSV or PDF\n• Email reports to stakeholders\n• Schedule automated reports (daily, weekly, monthly)'
      },
      {
        title: 'Employee Performance Reports',
        content: 'Track staff productivity:\n• Reports → Employee Performance\n• Metrics per employee:\n  - Orders processed\n  - Revenue generated\n  - Average ticket size\n  - Tips earned\n  - Refunds issued\n  - Hours worked\n• Leaderboards and rankings\n• Identify top performers\n• Coaching opportunities\n• Export for payroll\n• Commission calculations (if enabled)'
      },
      {
        title: 'Inventory Reports',
        content: 'Stock management analytics:\n• Current inventory levels\n• Low stock alerts\n• Stock movement history\n• Best/worst selling products\n• Reorder suggestions\n• Waste tracking\n• Inventory value\n• Turnover rates\n• Export for accounting\n\nSchedule automated low stock alerts via email.'
      },
      {
        title: 'Time Tracking Reports',
        content: 'Employee time and attendance:\n• Clock in/out records\n• Total hours per employee\n• Overtime calculations\n• Break tracking\n• Time editing audit log\n• Export timesheet for payroll\n• Compare scheduled vs actual\n• Cost of labor reports'
      },
      {
        title: 'Premium Analytics (Motherboard Feature)',
        content: 'Advanced analytics require NFT:\n• Customer lifetime value\n• Cohort analysis\n• Predictive analytics\n• Custom dashboards\n• Advanced forecasting\n• Multi-location comparison\n• Real-time alerts\n• API access for custom integration\n\nUnlock via Motherboard → Premium Analytics chip'
      },
      {
        title: 'Tax Reports',
        content: 'Tax compliance reporting:\n• Sales tax collected by period\n• Tax by jurisdiction\n• Tax-exempt transactions\n• EBT/SNAP breakdown\n• Export for accountant\n• Quarterly summaries\n• Annual reports\n• Audit trail\n\nSupports multi-state tax requirements.'
      }
    ]
  },
  {
    id: 'online-ordering',
    icon: Globe,
    title: 'Online Ordering',
    color: 'text-teal-600',
    content: [
      {
        title: 'Online Menu Setup - Complete Guide',
        content: 'STEP 1: Enable Feature\n• Settings → Online Ordering\n• Toggle "Enable Online Ordering"\n\nSTEP 2: Fulfillment Options\n• Enable Pickup: Allow customer pickup\n• Enable Delivery: Offer delivery service\n• Set delivery radius (miles)\n• Set delivery fee\n• Set minimum order amounts\n\nSTEP 3: Operating Hours\n• Enter business hours per day\n• Set special holiday hours\n• Orders only accepted during open hours\n• Display estimated wait time\n\nSTEP 4: Payment Options\n• Allow cash on pickup (toggle)\n• Enable card payments (requires gateway)\n• Enable crypto payments (if Solana Pay enabled)\n\nSTEP 5: Branding\n• Upload logo\n• Set primary and secondary colors\n• Add welcome message\n• Add special instructions\n• Configure menu layout\n\nSTEP 6: Menu Configuration\n• Choose which products appear online\n• Set online-only pricing (if different)\n• Add product photos (highly recommended)\n• Write descriptions\n• Configure modifiers\n\nSTEP 7: Get Your URL\n• Copy unique menu URL\n• Format: yourbusiness.opentill-pos.com\n• Or set up custom domain (Settings → Custom Domains)\n\nSTEP 8: Promote Your Menu\n• Add link to website\n• Share on social media (Facebook, Instagram)\n• Print QR code on receipts/menus\n• Add to Google My Business\n• Email to customer list'
      },
      {
        title: 'Managing Online Orders',
        content: 'Order workflow:\n1. Customer places order via online menu\n2. Order appears in "Online Orders" page\n3. Dashboard notification shows new order\n4. Review order details:\n   • Items and modifiers\n   • Special instructions\n   • Fulfillment type (pickup/delivery)\n   • Requested time\n   • Payment status\n5. Actions:\n   • Accept order → Set estimated ready time\n   • Reject order → Enter reason, customer notified\n6. Accepted orders:\n   • Send to kitchen display\n   • Prepare items\n   • Mark "Ready for Pickup" or "Out for Delivery"\n7. Customer receives status updates:\n   • Order confirmed\n   • Being prepared\n   • Ready for pickup\n   • Out for delivery (if applicable)\n8. Mark "Completed" when fulfilled\n\nOrder history stored with all details.'
      },
      {
        title: 'Delivery & Pickup Configuration',
        content: 'Fulfillment settings:\n\nPickup:\n• Enable/disable\n• Estimated prep time\n• Pickup instructions\n• Curbside option\n\nDelivery:\n• Enable/disable\n• Delivery radius (miles from your location)\n• Delivery fee (flat or percentage)\n• Minimum order for free delivery\n• Estimated delivery time\n• Driver assignment (manual or third-party)\n• Real-time tracking (if integrated)\n\nAddress Validation:\n• System checks if address in delivery radius\n• Shows delivery fee at checkout\n• Calculates distance automatically'
      },
      {
        title: 'Marketplace Integrations',
        content: 'Connect third-party delivery platforms:\n\nAvailable Integrations:\n• DoorDash - Wide coverage, fast delivery\n• Grubhub - Restaurant-focused platform\n• Uber Eats - Large customer base\n• Takeout7 - Regional service\n\nSetup Process:\n1. Navigate to Marketplace page\n2. Click "Connect" on desired platform\n3. Follow OAuth connection flow\n4. Enter API credentials\n5. Map your menu to their platform\n6. Configure pricing and availability\n7. Enable auto-accept or manual review\n\nBenefits:\n• Orders sync automatically to openTILL\n• Menu updates push to all platforms\n• Unified order management\n• Consolidated reporting\n• Single POS for all orders'
      },
      {
        title: 'QR Code Ordering',
        content: 'Contactless table ordering:\n1. Generate unique QR codes per table\n2. Print and place on tables\n3. Customers scan with phone\n4. Opens your online menu\n5. Select items and checkout\n6. Order sent to kitchen\n7. Serve when ready\n\nIdeal for:\n• Restaurants\n• Food trucks\n• Bars and breweries\n• Events and catering'
      }
    ]
  },
  {
    id: 'employees',
    icon: Users,
    title: 'Employee Management',
    color: 'text-red-600',
    content: [
      {
        title: 'Adding Employees',
        content: 'Create employee accounts:\n1. Navigate to Users page from System Menu\n2. Click "Add Employee" button\n3. Fill required information:\n   • Full Name (required)\n   • Email Address (required, unique)\n   • 4-Digit PIN (for quick login)\n   • Phone Number (optional)\n4. Set Role:\n   • Merchant Admin - Full system access\n   • Manager - Most features, limited settings\n   • Cashier - POS and basic features only\n   • Custom - Configure specific permissions\n5. Assign Permissions:\n   • Process orders\n   • Manage products\n   • View reports\n   • Manage customers\n   • Access settings\n   • Issue refunds\n   • Manage employees\n6. Click "Save Employee"\n7. Employee receives welcome email with login instructions\n8. They can clock in with PIN or email login'
      },
      {
        title: 'Roles & Permissions',
        content: 'Built-in role hierarchy:\n\nMerchant Admin:\n• Full access to all features\n• Manage users and permissions\n• Access financial reports\n• Configure system settings\n• Process refunds\n\nManager:\n• Process orders and refunds\n• Manage products and inventory\n• View reports (limited financial)\n• Manage customers\n• Cannot manage users or settings\n\nCashier:\n• Process orders only\n• View product catalog (read-only)\n• Customer lookup\n• Cannot access reports or settings\n• Cannot issue refunds\n\nCustom:\n• Configure exact permissions per employee\n• Granular control over features\n• Create department managers\n• Assign specific report access'
      },
      {
        title: 'Time Tracking & Clock In/Out',
        content: 'Employee time management:\n\nClock In:\n1. Employee opens openTILL\n2. Clicks "PIN Login"\n3. Enters 4-digit PIN\n4. System records clock-in time\n5. Employee can now work\n\nClock Out:\n1. From System Menu, click profile\n2. Select "Clock Out"\n3. Confirm action\n4. System records clock-out time\n5. Session ends\n\nManagement:\n• Navigate to Users → Time Tracking tab\n• View all clock in/out records\n• Edit entries (admin only)\n• Add manual entries\n• Approve/reject timesheets\n• Export for payroll\n• Calculate hours:\n  - Regular hours\n  - Overtime\n  - Break time\n  - Total per pay period\n\nReports:\n• Hours by employee\n• Hours by date range\n• Cost of labor\n• Compare scheduled vs actual'
      },
      {
        title: 'Performance Tracking',
        content: 'Monitor employee metrics:\n• Navigate to Reports → Employee Performance\n• View per employee:\n  - Orders processed\n  - Revenue generated\n  - Average order value\n  - Tips earned (if enabled)\n  - Refunds issued\n  - Customer ratings (if enabled)\n  - Hours worked\n  - Revenue per hour\n• Leaderboards\n• Set goals and benchmarks\n• Coaching opportunities\n• Reward top performers'
      },
      {
        title: 'PIN Reset & Password Management',
        content: 'Reset employee credentials:\n\nPIN Reset (Admin Only):\n1. Navigate to Users page\n2. Click employee to edit\n3. Click "Reset PIN"\n4. Enter new 4-digit PIN\n5. Save changes\n6. Notify employee of new PIN\n\nPassword Reset:\nEmployee can reset own password:\n1. Go to login page\n2. Click "Forgot Password"\n3. Enter email\n4. Receive reset link\n5. Create new password\n\nOr admin can force reset from Users page.'
      }
    ]
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Settings & Configuration',
    color: 'text-gray-600',
    content: [
      {
        title: 'General Settings',
        content: 'Basic business configuration:\n• Business Name - Appears on receipts and displays\n• Display Name - Public-facing name\n• Tax Rate - Default sales tax percentage\n• Timezone - For accurate reporting\n• Currency - USD, CAD, etc.\n• Operating Hours - When you accept orders\n• Contact Information - Phone, email, address\n• Receipt Settings:\n  - Logo on receipts\n  - Footer text\n  - Show/hide pricing details\n  - Email receipts automatically\n• Tips - Enable and set default percentages'
      },
      {
        title: 'Payment Gateways',
        content: 'Configure payment processors:\n• Navigate to Settings → Payment Gateways\n• Available gateways:\n  - openTILL Payments (recommended — managed Stripe Connect)\n  - Stripe (your own account)\n  - Square\n• For each gateway:\n  1. Enter API credentials (or complete Stripe Connect for openTILL Payments)\n  2. Select test/live mode\n  3. Test connection\n  4. Enable/disable\n  5. Set as default (if multiple)\n• Save all changes\n• Test with small transaction\n\nSee "Payment Processing" and "openTILL Payments" sections for detailed setup.'
      },
      {
        title: 'Pricing & Surcharge',
        content: 'Configure dual pricing:\n\nDual Pricing Settings:\n• Enable Dual Pricing - Toggle on/off\n• Surcharge Percentage - e.g., 3.5%\n• Flat Fee Amount - Additional fixed fee\n• Apply Flat Fee to All - Even cash payments\n• Show Dual Prices - Display both on POS\n• Region - US, CA, or Other (compliance)\n• Pricing Mode:\n  - Surcharge: Higher price for cards\n  - Cash Discount: Lower price for cash\n• Sync with Payments - Auto-match surcharge to your openTILL Payments (Stripe) processing rate + platform fee\n\nHow it works:\n• Base price is cash price\n• Card payments add surcharge\n• Displayed clearly to customer\n• Surcharge shown separately on receipt\n• Compliant with card network rules'
      },
      {
        title: 'Customer Display',
        content: 'Configure customer-facing screen:\n• Settings → Customer Display\n• Enable customer display\n• Copy unique display URL\n• Branding:\n  - Upload logo\n  - Set colors\n  - Welcome message\n• Display options:\n  - Show item images\n  - Show pricing details\n  - Show dual pricing\n  - Enable tips on display\n  - Show payment instructions\n• Get URL and open on secondary screen/tablet\n• Display auto-syncs with POS\n• Or use Station-based mobile display (see Stations & Mobile Display section)'
      },
      {
        title: 'Kitchen Display',
        content: 'Configure kitchen screen:\n• Settings → Kitchen Display\n• Enable kitchen display\n• Get unique display URL\n• Settings:\n  - Auto-print to receipt printer\n  - Group by station (grill, fryer, etc.)\n  - Order notification sound\n  - Display layout (grid or list)\n  - Auto-advance when complete\n• Open URL on kitchen screen\n• Orders appear when "Send to Kitchen" clicked\n• Staff marks items as prepared'
      },
      {
        title: 'Solana Pay (Crypto Payments)',
        content: 'Accept cryptocurrency:\n• Settings → Solana Pay\n• Enable Solana Pay\n• Select Network:\n  - Mainnet (real money)\n  - Devnet (testing)\n• Enter your Solana wallet address\n• Choose accepted token:\n  - USDC (recommended stablecoin)\n  - Custom SPL token\n• For custom tokens:\n  - Token mint address\n  - Token symbol\n  - Token decimals\n• Display in Customer Terminal - Toggle\n• Save settings\n• Test with devnet first\n• Switch to mainnet when ready'
      },
      {
        title: 'Web3 Identity & Wallet Connection',
        content: 'Link blockchain wallets:\n• Settings → Web3 Identity\n• Connect Wallet button\n• Choose wallet:\n  - Phantom\n  - Solflare\n  - Jupiter\n  - Mobile wallets\n• Approve connection\n• Sign message to verify ownership\n• Wallet linked to your account\n• Benefits:\n  - Web3 authentication\n  - Access Motherboard features\n  - $DUC Vault\n  - SMPF Wallet\n  - NFT-gated features\n• Can link multiple wallets\n• Disconnect anytime'
      },
      {
        title: 'Custom Domains',
        content: 'Use your own domain:\n\nSTEP 1: Add Domain\n• Settings → Custom Domains\n• Click "Add Domain"\n• Enter your domain (e.g., pos.myrestaurant.com)\n• Select domain type:\n  - POS Access\n  - Online Ordering\n  - Both\n\nSTEP 2: Verify Ownership\n• System provides DNS records\n• Add to your domain registrar:\n  - CNAME record or A record\n  - TXT record for verification\n• Wait for DNS propagation (1-48 hours)\n• Click "Verify Domain"\n\nSTEP 3: SSL Certificate\n• System auto-provisions SSL certificate\n• HTTPS enabled automatically\n• Certificate auto-renews\n\nSTEP 4: Activate\n• Domain status shows "Active"\n• Access your POS via custom domain\n• Share branded online menu URL'
      },
      {
        title: 'Departments Management',
        content: 'Organize your catalog:\n• Settings → Departments (or Departments page)\n• Create new department:\n  - Name (Food, Drinks, Retail)\n  - Color (for visual identification)\n  - Icon (from Lucide library)\n  - Display order\n• Edit existing departments\n• Assign products to departments\n• Departments appear as filters on POS\n• Department-based reporting'
      },
      {
        title: 'Devices & Hardware',
        content: 'Configure hardware:\n• Settings → Devices\n• Add devices:\n\nCard Readers:\n• Type: Verifone, Clover, PAX, Square\n• Connection: USB, Ethernet, WiFi\n• IP Address and Port (for network)\n• Test connection\n\nReceipt Printers:\n• Type: Thermal, Impact\n• Connection: USB, Ethernet\n• Paper size (58mm, 80mm)\n• Test print\n\nBarcode Scanners:\n• Type: USB, Bluetooth, Camera\n• Auto-detect (USB plug & play)\n• Test scan\n\nCash Drawers:\n• Connect via receipt printer\n• Manual or auto-open\n• Test open drawer'
      },
      {
        title: 'Security Settings',
        content: 'Secure your system:\n• Settings → Security\n• Password Policy:\n  - Minimum length\n  - Require special characters\n  - Password expiration\n• Session Settings:\n  - Auto-logout after inactivity\n  - Timeout duration\n• Two-Factor Authentication:\n  - Enable for all users\n  - SMS or authenticator app\n• Audit Logs:\n  - Track all system changes\n  - Who did what and when\n  - Export for compliance\n• IP Restrictions:\n  - Whitelist trusted IPs\n  - Block access from other locations'
      },
      {
        title: 'Stations & Mobile Display',
        content: `Configure POS stations and mobile customer displays:

Stations:
• Settings → Devices → Stations (or Stations page)
• Create stations for each register/area:
  - Counter 1, Bar, Server Station, etc.
• Assign receipt printer, kitchen printer, bar printer per station
• Enable mobile access per station (toggle)
• Generate a secure mobile station token
• Set optional station PIN for cashier controls
• Configure mobile display timeout (seconds on approved/declined screen)
• Set max simultaneous mobile connections

Mobile Station Display:
• Each station with mobile access gets a unique URL
• Format: /mobile/station/<token>
• Open on any mobile device (phone, tablet)
• Shows customer-facing display:
  - Items being added to cart
  - Prices and totals
  - Dual pricing if enabled
  - Payment method selection
  - Tip screen
  - Transaction status
• No login required — token authorizes access
• QR code available for quick mobile device pairing
• Ideal for:
  - Handheld/mobile POS
  - Customer-facing display on tablets
  - Drive-thru or curbside pickup

Security:
• Mobile station tokens are cryptographically random
• Tokens can be regenerated at any time (invalidates old URLs)
• Optional PIN for cashier controls on mobile
• Max connection limit prevents abuse
• Token expiration can be configured`
      }
    ]
  },
  {
    id: 'hardware',
    icon: Monitor,
    title: 'Hardware Setup',
    color: 'text-cyan-600',
    content: [
      {
        title: 'Recommended Hardware',
        content: 'openTILL works on any device:\n\nPOS Terminal:\n• Tablet: iPad, Android tablet (10"+ recommended)\n• Desktop: Windows, Mac, Linux\n• All-in-one POS systems\n• Minimum: Dual-core processor, 4GB RAM\n\nCard Readers:\n• Stripe Terminal reader (BBPOS WisePad, WisePOS E)\n• Verifone VX520\n• Clover terminals\n• PAX devices\n• Square reader\n• Ellipal crypto terminal\n\nReceipt Printers:\n• Epson TM-T88VI (thermal)\n• Star Micronics TSP143IIIBI\n• Any ESC/POS compatible\n\nBarcode Scanners:\n• Zebra DS2208\n• Honeywell Voyager 1250g\n• Any USB HID scanner\n• Camera-based scanning (built-in)\n\nCash Drawer:\n• APG Vasario Series\n• Star Micronics CD series\n• Any RJ11/RJ12 compatible\n\nCustomer Display:\n• 7"-10" tablet\n• Secondary monitor\n• Any device with web browser'
      },
      {
        title: 'Card Reader Setup',
        content: 'Connect payment terminal:\n\nUSB Connection:\n1. Plug card reader into USB port\n2. Install driver if prompted\n3. Settings → Devices → Card Readers\n4. Add device, select USB\n5. Test connection\n\nEthernet/WiFi Connection:\n1. Connect reader to network\n2. Note reader IP address (usually on screen)\n3. Settings → Devices → Card Readers\n4. Add device, select Network\n5. Enter IP address and port\n6. Test connection\n7. Process test transaction\n\nSupported readers:\n• Stripe Terminal: WisePad, WisePOS E, Verifone P400\n• Verifone: VX520, VX680, VX820\n• Clover: Mini, Flex, Station\n• PAX: S80, S300, A920\n• Square: Reader, Terminal\n• Ellipal: For crypto payments'
      },
      {
        title: 'Receipt Printer Setup',
        content: 'Configure receipt printing:\n\nUSB Thermal Printer:\n1. Connect via USB\n2. Install driver (Windows/Mac)\n3. Settings → Devices → Printers\n4. Add printer\n5. Select USB, choose from list\n6. Configure:\n   - Paper width (58mm or 80mm)\n   - Print speed\n   - Darkness\n7. Test print\n8. Enable auto-print (optional)\n\nNetwork Printer:\n1. Connect printer to network\n2. Note printer IP address\n3. Settings → Devices → Printers\n4. Add printer, select Network\n5. Enter IP address\n6. Test print\n\nKitchen Printer:\n• Follow same setup steps\n• Assign as "Kitchen Printer"\n• Set to print when "Send to Kitchen" clicked\n• Larger text for readability\n• Auto-cut between orders'
      },
      {
        title: 'Barcode Scanner Setup',
        content: 'Configure barcode scanning:\n\nUSB Scanner (Plug & Play):\n1. Plug scanner into USB port\n2. No configuration needed\n3. openTILL auto-detects\n4. Test scan on POS or Products page\n5. Supported formats: UPC, EAN, Code 39, Code 128\n\nBluetooth Scanner:\n1. Put scanner in pairing mode\n2. Device Bluetooth settings\n3. Pair with scanner\n4. openTILL auto-detects\n5. Test scan\n\nCamera Scanner:\n• Built-in to openTILL\n• Click camera icon on POS\n• Allow camera access\n• Point at barcode\n• Auto-scans and adds product\n\nWorks for:\n• Adding products to cart\n• Looking up product info\n• Creating new products'
      },
      {
        title: 'Cash Drawer Setup',
        content: 'Connect cash drawer:\n\n1. Cash drawer connects to receipt printer:\n   • Uses RJ11 or RJ12 cable\n   • Plug into printer "Cash Drawer" port\n\n2. Configure drawer behavior:\n   • Settings → Devices → Cash Drawer\n   • Auto-open on cash sale (toggle)\n   • Auto-open on shift start (toggle)\n   • Manual open button (for managers)\n\n3. Cash Management:\n   • Record opening float\n   • Track cash in/out\n   • Closing count\n   • Variance reports\n   • Bank deposits\n\n4. Security:\n   • Only managers can open drawer\n   • All opens logged\n   • Audit trail'
      },
      {
        title: 'Customer Display Setup',
        content: 'Set up customer-facing screen:\n\n1. Get a secondary display:\n   • Tablet (iPad, Android)\n   • Monitor\n   • TV\n   • Any device with browser\n\n2. Get Display URL:\n   • Settings → Customer Display\n   • Copy unique URL\n   • Or use Station-based Mobile Display URL\n\n3. Open on Display:\n   • Open browser on display device\n   • Navigate to URL\n   • Bookmark it\n   • Set full-screen mode (F11 or browser setting)\n\n4. Position Display:\n   • Face toward customer\n   • At comfortable viewing angle\n   • Secure to prevent theft\n\n5. Display shows:\n   • Welcome screen with logo\n   • Items as added\n   • Prices and totals\n   • Payment prompts\n   • Thank you message\n\n6. Updates automatically as cashier works\n7. Touch-enabled for customer input (tips, signatures)'
      },
      {
        title: 'Kitchen Display Setup',
        content: 'Set up kitchen screen:\n\n1. Get Kitchen Display:\n   • Large tablet (12"+)\n   • Monitor or TV\n   • Wall-mountable recommended\n\n2. Get Display URL:\n   • Settings → Kitchen Display\n   • Copy unique URL\n\n3. Open on Display:\n   • Open browser\n   • Navigate to URL\n   • Full-screen mode\n   • Mount in kitchen area\n\n4. Configure Layout:\n   • Grid or list view\n   • Group by station\n   • Order of stations\n   • Audio alerts\n\n5. Usage:\n   • Orders appear when sent from POS\n   • Large, readable text\n   • Color-coded by status:\n     - New: Red\n     - In Progress: Yellow\n     - Ready: Green\n   • Touch items to mark complete\n   • Auto-advances to next order\n\n6. Multiple Displays:\n   • Separate URL per station\n   • Grill, Fryer, Salad, Drinks, etc.\n   • Filter items by station'
      }
    ]
  },
  {
    id: 'smpf-wallet',
    icon: Wallet,
    title: 'SMPF Wallet (Solana Wallet)',
    color: 'text-emerald-600',
    content: [
      {
        title: 'What is the SMPF Wallet?',
        content: `The SMPF Wallet is your non-custodial Solana wallet built directly into openTILL:
• Create, back up, and manage a Solana-compatible wallet
• Hold SOL, $DUC, and other SPL tokens
• Send and receive crypto payments
• View transaction history
• Swap tokens via Jupiter DEX
• View and manage NFTs
• Export private keys for use with Phantom, Solflare, and other wallets
• One wallet per email account (enforced)

Access: System Menu → SMPF Wallet

Important: The SMPF Wallet is non-custodial. Your private keys are encrypted and stored locally on your device (IndexedDB). openTILL cannot recover your wallet if you lose your password and backup file.`
      },
      {
        title: 'Creating Your Wallet',
        content: `First-time setup:
1. Navigate to System Menu → SMPF Wallet
2. If no wallet exists, the onboarding flow begins
3. Choose wallet type:
   • Standard Wallet — random Solana keypair
   • Vanity Wallet — custom prefix address (takes longer to generate)
4. Set a strong password (used to encrypt your private key locally)
5. Confirm password
6. Wallet keypair is generated
7. BACK UP YOUR WALLET (see next section)

One Wallet Per Email:
• Each email account can only have one SMPF Wallet
• If you already have a wallet, you cannot create another
• To replace: Reset & Regenerate (requires explicit confirmation)

Important for Vanity Wallets:
• Vanity address wallets are NOT recoverable via a 12-word seed phrase
• You MUST download the encrypted backup file
• If you lose the backup file and password, funds are permanently lost`
      },
      {
        title: 'Backing Up Your Wallet',
        content: `Critical: Back up your wallet immediately after creation:

1. During onboarding, the Backup step appears
2. Download the encrypted backup file (.json)
3. Store it in a secure location:
   • Encrypted USB drive
   • Password manager
   • Cloud storage with 2FA
4. Your password encrypts the backup — do NOT lose it
5. The backup file + password = your only recovery method

Warning:
• If you lose BOTH your backup file AND your password, your funds are permanently irrecoverable
• openTILL support cannot recover your wallet
• There is no seed phrase recovery for vanity address wallets`
      },
      {
        title: 'Wallet Dashboard',
        content: `What you see on the SMPF Wallet page:

Overview Tab:
• SOL balance (with USD valuation via Jupiter price API)
• $DUC token balance
• Other SPL token balances
• Total portfolio value in USD
• $DUC Presale card (when presale is active)
• Jupiter Swap card (with referral link)

Tokens Tab:
• List of all held SPL tokens
• Token names, symbols, and images (from on-chain Metaplex metadata)
• USD value per token
• Add custom token mints manually
• Hide/show tokens from display
• Toggle visibility of specific assets

Activity Tab:
• Recent Solana transaction history
• Transaction signatures with Solscan links
• Transaction status (confirmed, failed)
• Timestamps and slot indices
• Auto-refreshes every 30 seconds

NFT Gallery:
• View NFTs held in your wallet
• NFT images and metadata
• Send NFTs to other wallets`
      },
      {
        title: 'Sending Crypto',
        content: `Transfer SOL or SPL tokens:
1. Click "Send" button
2. Select asset (SOL, $DUC, or other token)
3. Enter recipient address:
   • Paste Solana wallet address
   • Or select from Address Book
   • Or scan QR code
4. Enter amount
5. Review transaction details:
   • Send amount
   • Network fee (estimated)
   • Total cost
6. Enter your wallet password to sign
7. Confirm and broadcast
8. Transaction signature provided
9. Verify on Solscan

Note: If sending a token for the first time to a new wallet, an Associated Token Account (ATA) will be created automatically (requires a small SOL fee for rent).`
      },
      {
        title: 'Receiving Crypto',
        content: `Get your wallet address to receive funds:
1. Click "Receive" button
2. Your Solana wallet address is displayed
3. QR code generated for easy mobile scanning
4. Copy address to clipboard
5. Share with sender

You can receive:
• SOL (native Solana)
• $DUC and any SPL token (if you have an ATA for that token, or the sender creates one)
• NFTs`
      },
      {
        title: 'Swapping via Jupiter',
        content: `Trade tokens directly in the wallet:
1. Click the Jupiter Swap card or "Swap" button
2. Select token to swap FROM (e.g., $DUC)
3. Select token to swap TO (e.g., USDC, SOL)
4. Enter amount
5. Review:
   • Estimated receive amount
   • Exchange rate
   • Price impact
   • Network fee
   • Slippage tolerance
6. Enter wallet password
7. Confirm and sign transaction
8. Swap executes on Jupiter DEX
9. New tokens arrive in your wallet

Powered by Jupiter:
• Best rates aggregated across all Solana DEXs
• Low fees
• Fast execution
• Referral fees support openTILL development`
      },
      {
        title: 'Address Book',
        content: `Save frequently used addresses:
1. Navigate to Address Book in wallet
2. Click "Add Contact"
3. Enter:
   • Contact name (e.g., "Supplier", "Business Partner")
   • Solana wallet address
4. Save
5. When sending crypto, select from Address Book instead of pasting

Manage contacts:
• Edit names
• Delete contacts
• Addresses validated as Solana public keys`
      },
      {
        title: 'Exporting Private Keys',
        content: `Use your wallet in Phantom, Solflare, or other external wallets:

1. Click "Export Private Key" (in wallet settings)
2. Read the security warning
3. Enter your wallet password to decrypt
4. Your private key is displayed (base58 encoded)
5. Copy the private key
6. Import into your preferred wallet:
   • Phantom: Settings → Add/Connect Wallet → Import Private Key
   • Solflare: Settings → Import Private Key
7. Your wallet address and funds are now accessible in that wallet

Security Warnings:
• NEVER share your private key with anyone
• Anyone with the key has full access to your funds
• openTILL will never ask for your private key
• Clear your clipboard after copying
• Use hold-to-confirm pattern to prevent accidental export
• The key is validated against your wallet address before display`
      },
      {
        title: 'Reset & Regenerate Wallet',
        content: `Resolve legacy wallet issues or start fresh:

Warning: This is a HIGH-RISK action. Resetting generates a new wallet. Your old wallet will be permanently inaccessible if you do not have the backup file and password.

Before resetting:
1. Export your private key and import it into Phantom/Solflare
2. Verify you can access your funds from the external wallet
3. Transfer any funds to the new wallet after regeneration

Reset Process:
1. Navigate to wallet settings
2. Click "Reset & Regenerate"
3. A multi-step confirmation appears:
   • Step 1: Acknowledge funds may be lost
   • Step 2: Confirm you have backed up or transferred funds
   • Step 3: Check the liability disclaimer checkbox
   • Step 4: Type "RESET" to confirm
4. Old wallet data is deleted from this device
5. New wallet onboarding begins
6. Create new password and backup

This action is irreversible. Proceed only if you understand the risks.`
      },
      {
        title: 'Network & RPC Settings',
        content: `Which Solana network your wallet connects to:
• Admin-configured default network (Mainnet, Testnet, Devnet)
• Settings → Blockchain (admin only)
• RPC endpoints configured by admin in DUCWalletSettings

How balances are fetched:
• Server-side balance fetching for $DUC (bypasses browser RPC issues)
• Multi-RPC failover with request timeouts
• CORS-friendly Solana RPCs used for browser-based calls
• Token metadata from on-chain Metaplex Token Metadata

If balances don't load:
• Check your internet connection
• Try refreshing the page
• Contact admin if RPC endpoints are down
• Server-side $DUC balance fetcher is the most reliable method`
      }
    ]
  },
  {
    id: 'vault',
    icon: Wallet,
    title: '$DUC Vault (Crypto Rewards)',
    color: 'text-yellow-600',
    content: [
      {
        title: 'What is $DUC Vault?',
        content: 'Cryptocurrency rewards program for openTILL merchants:\n• Earn $DUC tokens for processing credit card payments\n• Earn 0.5% of your monthly CC processing volume in $DUC\n• Stake $DUC to earn APY (up to 20% for 365-day lockup)\n• Swap $DUC for USDC or other tokens via Jupiter DEX\n• Rewards calculated automatically at month-end\n\nExample:\n• Process $10,000 in card payments\n• Earn 0.5% = $50 worth of $DUC\n• Stake for 12% APY\n• Compound rewards monthly\n\nAccess: Navigate to "$DUC Vault" from System Menu\n\nRequirement: Connect a Solana wallet in Settings → Wallet & Payments first, or use the SMPF Wallet'
      },
      {
        title: 'Earning Rewards',
        content: 'How rewards work:\n\n1. Automatic Calculation:\n   • System tracks credit card processing volume\n   • Calculates rewards at month end\n   • Rewards appear in "Pending" status\n\n2. Reward Types:\n   • Processing Volume - 0.5% of CC volume\n   • Bonus - Platform bonuses\n   • Referral - Refer other merchants\n   • Staking Yield - Interest on staked tokens\n\n3. View Rewards:\n   • Navigate to $DUC Vault\n   • See pending and available rewards\n   • View earning history\n   • Track total earned\n\n4. Minimum Claim:\n   • Must accumulate minimum amount (e.g., 10 $DUC)\n   • Prevents excessive transaction fees\n   • Configure threshold in settings'
      },
      {
        title: 'Claiming Rewards',
        content: 'Claim your $DUC:\n\n1. Connect Wallet:\n   • Click "Connect Wallet" in Vault\n   • Choose wallet (Phantom, Solflare, etc.)\n   • Or use your SMPF Wallet\n   • Approve connection\n\n2. Claim Tokens:\n   • View available rewards\n   • Click "Claim Rewards" button\n   • Approve transaction in wallet\n   • Tokens sent to your wallet\n   • Usually takes 30-60 seconds\n\n3. Transaction Record:\n   • Solana transaction signature provided\n   • Verify on Solscan or Solana Explorer\n   • Claim history in Vault\n\n4. What to Do with $DUC:\n   • Hold for potential appreciation\n   • Stake for APY\n   • Swap for USDC or other tokens\n   • Use for platform benefits (future features)'
      },
      {
        title: 'Staking $DUC',
        content: 'Earn passive income:\n\n1. Stake Tokens:\n   • Navigate to $DUC Vault → Staking tab\n   • Enter amount to stake\n   • Choose lockup period:\n     - 30 days: 8% APY\n     - 90 days: 12% APY\n     - 180 days: 15% APY\n     - 365 days: 20% APY\n   • Click "Stake"\n   • Approve in wallet\n\n2. Staking Benefits:\n   • Earn interest on locked tokens\n   • Compound rewards automatically\n   • Early unlock penalty: 10%\n\n3. View Stakes:\n   • Active stakes\n   • Earned rewards\n   • Unlock dates\n   • Total staked amount\n\n4. Unstaking:\n   • Wait for lockup period\n   • Click "Unstake"\n   • Approve transaction\n   • Tokens + rewards returned to wallet'
      },
      {
        title: 'Swapping via Jupiter',
        content: 'Trade $DUC for other tokens:\n\n1. Navigate to Swap Tab:\n   • $DUC Vault → Swap\n   • Or use SMPF Wallet → Jupiter Swap\n\n2. Select Tokens:\n   • From: $DUC\n   • To: USDC, SOL, or other SPL token\n\n3. Enter Amount:\n   • Amount of $DUC to swap\n   • System shows estimated receive amount\n   • Includes slippage and fees\n\n4. Review & Swap:\n   • Check exchange rate\n   • Review network fee\n   • Click "Swap"\n   • Approve in wallet\n   • Swap executes on Jupiter DEX\n   • Tokens arrive in wallet\n\n5. Powered by Jupiter:\n   • Best rates from all Solana DEXs\n   • Low fees\n   • Fast execution\n   • Referral fees support openTILL development'
      },
      {
        title: 'Vault Settings',
        content: 'Configure your rewards:\n• Navigate to $DUC Vault → Settings\n• Options:\n  - Minimum claim threshold\n  - Auto-stake rewards (toggle)\n  - Default staking period\n  - Wallet for rewards\n  - Email notifications for rewards\n• Super Admin can adjust:\n  - Reward percentage (default 0.5%)\n  - Staking APY rates\n  - Jupiter referral settings\n  - Token mint address'
      }
    ]
  },
  {
    id: 'motherboard',
    icon: Crown,
    title: 'Motherboard (NFT Features)',
    color: 'text-violet-600',
    content: [
      {
        title: 'What is Motherboard?',
        content: 'The Motherboard is openTILL\'s modular chip-based feature system:\n• Unlock premium features by purchasing "Chips" with $DUC tokens\n• Each chip represents a specific feature upgrade\n• Some chips are one-time purchases; others are recurring monthly/yearly\n• Blockchain-verified access — features activate instantly\n• Only pay for what you need\n\nHow it works:\n1. Connect your Solana wallet in Settings → Wallet & Payments\n2. Navigate to System Menu → Motherboard\n3. Browse available chips (or visit the Marketplace)\n4. Purchase a chip with $DUC tokens\n5. Feature unlocks instantly\n6. For subscription chips: feature stays active while subscription is paid\n\nAccess: Navigate to "Motherboard" from System Menu'
      },
      {
        title: 'Connecting Your Wallet',
        content: 'Link wallet to unlock features:\n\n1. Navigate to Motherboard page\n2. Click "Connect Wallet" button\n3. Choose wallet:\n   • Phantom (recommended)\n   • Solflare\n   • Jupiter\n   • Other Solana wallets\n   • Or use your built-in SMPF Wallet\n4. Approve connection\n5. Sign message to verify ownership\n6. System scans wallet for NFTs\n7. Eligible chips auto-unlock\n\nMultiple Wallets:\n• Can connect multiple wallets\n• NFTs from any connected wallet count\n• Switch between wallets\n• Disconnect anytime\n\nSecurity:\n• Read-only access\n• Cannot spend your tokens\n• Only checks NFT ownership\n• No private key access'
      },
      {
        title: 'Available Chips',
        content: 'Premium features available as chips:\n\nAI Assistant:\n• AI-powered business insights\n• Menu and pricing suggestions\n• Customer behavior analysis\n• Requires: AI Assistant Chip\n\nWebsite Generator:\n• Auto-generate a business website\n• Online menu integration\n• SEO-optimized\n• Requires: Website Generator Chip\n\nPremium Analytics:\n• Customer lifetime value\n• Predictive analytics\n• Custom dashboards\n• Requires: Premium Analytics Chip\n\nMulti-Location:\n• Manage multiple store locations\n• Location-specific inventory\n• Consolidated reporting\n• Requires: Multi-Location Chip\n\nAdvanced Inventory:\n• Automated reordering\n• Supplier management\n• Waste tracking\n• Requires: Advanced Inventory Chip\n\nCustomers / Loyalty / Online Ordering:\n• Customer database, loyalty points\n• Online menu and ordering\n• Requires respective chips\n\nNote: Browse all available chips at Marketplace from the homepage or System Menu. Available chips are configured by Super Admin.'
      },
      {
        title: 'Purchasing NFTs',
        content: 'How to acquire feature NFTs:\n\n1. Check Required Collection:\n   • View Chip details in Motherboard\n   • Note collection address\n   • See floor price estimate\n\n2. Buy NFT:\n   • Visit Solana NFT marketplace:\n     - Magic Eden (magiceden.io)\n     - Tensor (tensor.trade)\n     - OpenSea (Solana)\n   • Search for collection address\n   • Purchase NFT\n   • NFT arrives in your wallet\n\n3. Verify Ownership:\n   • Return to openTILL Motherboard\n   • Connect wallet (if not already)\n   • Click "Refresh" or reconnect wallet\n   • System verifies NFT\n   • Feature unlocks\n\n4. Maintaining Access:\n   • Keep NFT in wallet for continued access\n   • Selling NFT removes feature access\n   • Transfer to another wallet if needed\n   • NFT can be listed on marketplace while in use'
      },
      {
        title: 'Using Unlocked Features',
        content: 'Access premium features:\n\n1. Chip shows "Unlocked" status\n2. Click "Access Feature" button\n3. Opens respective feature page\n4. Use as normal\n5. No additional payments required\n\nExample - Premium Analytics:\n• Navigate to Reports page\n• See "Premium Analytics" tab\n• Access advanced visualizations\n• Export custom reports\n• Use predictive tools\n\nFeature Access:\n• Available across all devices\n• No re-verification needed\n• Instant access\n• As long as you hold NFT'
      },
      {
        title: 'Troubleshooting NFT Verification',
        content: 'If feature not unlocking:\n\n1. Verify NFT Ownership:\n   • Open wallet\n   • Check NFT is in Collectibles/NFTs\n   • Verify correct wallet connected\n\n2. Refresh Connection:\n   • Disconnect wallet in Motherboard\n   • Reconnect wallet\n   • System re-scans\n\n3. Check Network:\n   • Ensure on Solana Mainnet (not Devnet)\n   • Verify wallet on correct network\n\n4. Clear Cache:\n   • Refresh browser\n   • Clear cache and cookies\n   • Reconnect wallet\n\n5. Contact Support:\n   • If still not working\n   • Provide:\n     - Wallet address\n     - NFT collection\n     - Screenshot of NFT in wallet\n   • Support can manually verify'
      }
    ]
  },
  {
    id: 'device-shop',
    icon: ShoppingBag,
    title: 'Device Shop',
    color: 'text-indigo-600',
    content: [
      {
        title: 'What is Device Shop?',
        content: 'Purchase POS hardware:\n• Browse recommended hardware\n• Card readers, printers, scanners, tablets\n• Pre-configured for openTILL\n• Fast shipping\n• Warranty and support included\n• Competitive pricing\n\nAccess: Navigate to "Device Shop" from System Menu\n\nBenefits:\n• Guaranteed compatibility\n• Plug-and-play setup\n• Bulk discounts available\n• Dealer pricing for resellers'
      },
      {
        title: 'Browsing Products',
        content: 'Find hardware:\n1. Navigate to Device Shop\n2. Browse by category:\n   • Terminals - All-in-one POS\n   • Card Readers - Payment terminals\n   • Printers - Receipt and kitchen\n   • Scanners - Barcode readers\n   • Displays - Customer and kitchen\n   • Tablets - iPad, Android devices\n   • Accessories - Cables, stands, cases\n   • Supplies - Paper, cleaning\n3. View product details:\n   • Photos\n   • Specifications\n   • Compatibility\n   • Price\n   • Reviews\n4. Add to cart\n5. Checkout'
      },
      {
        title: 'Placing Orders',
        content: 'Order hardware:\n\n1. Add Items to Cart:\n   • Click "Add to Cart" on products\n   • Adjust quantities\n   • Review cart\n\n2. Enter Shipping Info:\n   • Business name\n   • Shipping address\n   • Phone number\n   • Email for tracking\n\n3. Choose Shipping:\n   • Standard (5-7 days)\n   • Express (2-3 days)\n   • Overnight (next day)\n\n4. Payment:\n   • Card payment via Stripe\n   • PayPal\n   • ACH (for bulk orders)\n\n5. Review & Place Order:\n   • Review order summary\n   • Apply discount code if available\n   • Click "Place Order"\n   • Receive confirmation email\n\n6. Track Order:\n   • Check order status in Device Shop → My Orders\n   • Tracking number sent via email\n   • Estimated delivery date'
      },
      {
        title: 'Managing Orders',
        content: 'View order history:\n• Navigate to Device Shop → My Orders\n• See all orders:\n  - Order number\n  - Date placed\n  - Items ordered\n  - Total amount\n  - Status (pending, paid, shipped, delivered)\n  - Tracking number\n• Click order to view details\n• Download invoices\n• Track shipment\n• Request support'
      },
      {
        title: 'Returns & Support',
        content: 'Hardware issues:\n\n30-Day Return Policy:\n• Unused items in original packaging\n• Return shipping provided\n• Full refund issued\n\nWarranty:\n• 1-year manufacturer warranty on all hardware\n• Defects and malfunctions covered\n• Replacement or repair\n\nTechnical Support:\n• Contact Device Shop support\n• Phone, email\n• Setup assistance\n• Troubleshooting help\n• Replacement parts\n\nHow to Get Support:\n1. Navigate to Support page\n2. Select "Hardware Issue"\n3. Describe problem\n4. Attach photos if needed\n5. Submit ticket\n6. Support team responds within 24 hours'
      },
      {
        title: 'Affiliate Links',
        content: 'Recommended hardware via affiliate links:\n• Some products in the Shop include affiliate links to third-party retailers (e.g., Amazon)\n• Clicking "Shop" takes you to the retailer to complete the purchase\n• openTILL may earn a commission at no extra cost to you\n• Prices and availability set by the retailer\n\nSuper Admins manage affiliate products and links from the Super Admin panel (Affiliate Links manager).'
      }
    ]
  },
  {
    id: 'subdomain',
    icon: Link2,
    title: 'Subdomain (.sol)',
    color: 'text-purple-600',
    content: [
      {
        title: 'What is openTILL Subdomain?',
        content: 'Get your .opentill-pos.sol domain:\n• Unique Solana-based subdomain\n• Example: yourstore.opentill-pos.sol\n• Blockchain-verified ownership\n• Use for branding\n• Link to your online menu\n• Free for active merchants\n\nBenefits:\n• Web3 identity\n• Easy to remember\n• Shareable URL\n• SEO friendly\n• No renewal fees\n• On-chain verification'
      },
      {
        title: 'Requesting Your Subdomain',
        content: 'How to get your subdomain:\n\n1. Merchant applies during onboarding\n2. Or later via Settings → General\n3. Request your preferred name:\n   • All lowercase\n   • Letters, numbers, hyphens\n   • No special characters\n   • Availability checked\n4. Submit request → Status: Pending\n5. Super Admin reviews and approves\n6. Status becomes: Active\n7. Link to your Solana wallet (optional)\n8. Use for online menu, branding, and crypto payments\n\nNote: Super Admin can approve, regenerate, or disable subdomains'
      },
      {
        title: 'Using Your Subdomain',
        content: 'How to use subdomain:\n\n1. Share with customers:\n   • yourstore.opentill-pos.sol\n   • Links to your online menu\n   • Or custom landing page\n\n2. Add to Marketing:\n   • Print on business cards\n   • Social media bio\n   • Email signatures\n   • Storefront signage\n\n3. Wallet Integration:\n   • Link subdomain to Solana wallet\n   • Customers can send crypto to subdomain\n   • Resolves to your wallet address\n   • Easier than long wallet addresses\n\n4. Future Features:\n   • NFT integration\n   • Token-gated content\n   • Web3 rewards\n   • Decentralized identity'
      },
      {
        title: 'Subdomain Status',
        content: 'Status meanings:\n\nPending:\n• Request submitted\n• Awaiting Super Admin approval\n• No action needed from merchant\n\nActive:\n• Subdomain approved and live\n• Can be used publicly\n• Linked to your merchant account\n• Shown in Super Admin dashboard\n\nDisabled:\n• Subdomain deactivated\n• Usually for policy violations\n• Contact support to reinstate\n\nView status:\n• Settings → Subdomain\n• Or merchant details in Super Admin panel'
      }
    ]
  },
  {
    id: 'invoicing',
    icon: FileText,
    title: 'Invoicing & Paylinks',
    color: 'text-amber-600',
    content: [
      {
        title: 'Creating Invoices',
        content: `Send branded invoices to customers:
1. Navigate to System Menu → Invoices
2. Click "New Invoice"
3. Enter customer name and email
4. Set the amount due and currency
5. Add an optional due date and notes
6. Save — a unique invoice number and secure pay token are generated automatically
7. Invoices start in "draft" status until sent

Invoices are scoped to your merchant account and visible to admins and Super Admins.`
      },
      {
        title: 'Sending Paylinks',
        content: `Get paid online:
1. Open an invoice and click "Send"
2. Status moves to "sent" and a secure paylink is generated
3. Share the paylink with your customer by email or message
4. The paylink opens a branded payment page (PayInvoice)
5. Customer pays by card (Stripe) or crypto (Solana Pay)
6. Payment is confirmed and the invoice updates to "paid" automatically

No login required for the customer — the pay token validates access.`
      },
      {
        title: 'Invoice Statuses',
        content: `Lifecycle:
• draft — created, not yet sent
• sent — paylink delivered to customer
• paid — payment confirmed
• overdue — past due date and unpaid
• void — cancelled
• refunded — payment returned

Track every invoice from the Invoices page. Filter by status or search by invoice number.`
      },
      {
        title: 'Payments & Auto-Confirmation',
        content: `How payment works:
• Card payments create a Stripe Checkout Session via the paylink
• Crypto payments use Solana Pay with a QR code
• On success, the backend confirms the payment and marks the invoice paid
• paid_at timestamp and transaction IDs are stored on the invoice

Tip: Use invoices for catering, wholesale, B2B, or any order paid after pickup/delivery.`
      }
    ]
  },
  {
    id: 'delivery',
    icon: Truck,
    title: 'Delivery Management',
    color: 'text-emerald-600',
    content: [
      {
        title: 'Delivery Dashboard',
        content: `Manage deliveries from one screen:
• Navigate to System Menu → Delivery Dashboard
• View all delivery jobs for your merchant
• Jobs grouped by status: Available, Accepted, Picked Up, Delivered, Cancelled
• Filter by priority (normal, high, urgent)
• See customer name, phone, addresses, items summary, and total

Delivery jobs can be created manually or dispatched automatically from online orders.`
      },
      {
        title: 'Dispatching Delivery Jobs',
        content: `Create a delivery job:
1. Click "New Delivery"
2. Enter pickup address (your store) and delivery address (customer drop-off)
3. Add customer name, phone, and items summary
4. Set priority and total
5. Add special instructions/notes if needed
6. Save — job appears as "available"

When an online order with delivery is placed, a delivery job can be auto-created and linked to that order.`
      },
      {
        title: 'Driver Workflow',
        content: `Assign and track drivers:
1. A driver accepts an available job (status → accepted)
2. Driver arrives at pickup, marks "Picked Up" (picked_up_at recorded)
3. Driver delivers to customer, marks "Delivered" (delivered_at recorded)
4. Cancel if needed (status → cancelled)

Drivers use the Driver Dashboard to see assigned jobs and update status in real time. Each status change is timestamped for a full audit trail.`
      },
      {
        title: 'Driver Accounts',
        content: `Set up drivers:
• Add a staff member in Settings → Staff Management
• Assign the "driver" role
• Drivers log in via PIN or email and access the Driver Dashboard
• Drivers only see jobs assigned to them
• Admins can reassign or cancel jobs at any time

Use the route map to visualize pickup and drop-off locations.`
      }
    ]
  },
  {
    id: 'non-integrated-terminal',
    icon: Terminal,
    title: 'Non-Integrated Terminal',
    color: 'text-purple-600',
    content: [
      {
        title: 'What is the Non-Integrated Terminal?',
        content: `Card-present transactions without a direct gateway integration:
• Run credit/debit cards on standalone terminals (Verifone, PAX, etc.)
• The terminal processes the payment; openTILL records the transaction manually
• Ideal for merchants using existing merchant accounts or non-integrated hardware
• Access is gated — see NFT-Gated Access below

Access: System Menu → Non-Integrated Terminal (requires feature access).`
      },
      {
        title: 'NFT-Gated Access',
        content: `How access works:
• The Non-Integrated Terminal is a premium chip
• Purchase the chip with $DUC tokens in the Motherboard or Marketplace
• Owning the chip NFT unlocks the terminal feature for your account
• For recurring subscription chips, keep it active to maintain access
• Connect your Solana wallet in Settings → Wallet & Payments first

Super Admins can also grant feature access to specific merchants from the Merchant Management panel.`
      },
      {
        title: 'Processing a Transaction',
        content: `Card-present flow:
1. Open the Non-Integrated Terminal from System Menu
2. Enter the transaction amount
3. Run the card on your standalone terminal
4. Enter the approval code / reference returned by the terminal
5. Record the payment method and last 4 of the card
6. Confirm — the order is marked paid and recorded in order history
7. Print or email the receipt

All transactions are logged in audit logs (PCI-relevant) for compliance.`
      }
    ]
  },
  {
    id: 'builders',
    icon: Cpu,
    title: 'Builders & Chip Marketplace',
    color: 'text-blue-600',
    content: [
      {
        title: 'What is a Builder?',
        content: `Builders are developers who create chips (feature upgrades) for the openTILL Marketplace:
• Build integrations, analytics, AI tools, and more as "chips"
• Submit chips for review by the openTILL team
• Earn revenue share on every chip sold
• Manage your builder profile, submissions, and earnings from the Builder Dashboard

Ideal for independent developers, agencies, and integration partners.

Access: Register at the Builders portal from the homepage.`
      },
      {
        title: 'Becoming a Builder',
        content: `Get verified:
1. Visit the Builders landing page from the homepage
2. Click "Start Building" and complete the builder onboarding form
3. Provide your name, email, company, bio, and support contact
4. Submit for verification
5. openTILL team reviews and verifies your profile
6. Once verified, you can submit chips and receive payouts

You can optionally connect Stripe Connect for automatic payouts.`
      },
      {
        title: 'Submitting a Chip',
        content: `Publish a feature:
1. Navigate to Builder Dashboard → Submit a Chip
2. Enter chip name, symbol, category, and descriptions
3. Set billing type (one-time or recurring) and price in $DUC
4. Configure feature flags unlocked by the chip
5. Provide NFT collection address and metadata URI
6. Upload documentation and assets
7. Submit for review

Once approved by Super Admin, the chip appears in the Marketplace and Motherboard for merchants to purchase.`
      },
      {
        title: 'Builder Dashboard & Earnings',
        content: `Manage your portfolio:
• Overview: total chips, total sales, total installs, lifetime earnings
• Submission manager: track review status of each chip
• Analytics: sales trends, install counts, revenue by chip
• Profile settings: update bio, website, social links, support email
• Payouts: via Stripe Connect once configured

Revenue share defaults to 70% to the builder. Super Admin can adjust the platform fee.`
      }
    ]
  },
  {
    id: 'ai-features',
    icon: Lightbulb,
    title: 'AI Assistant & Website Generator',
    color: 'text-green-600',
    content: [
      {
        title: 'AI Assistant',
        content: `Get AI-powered insights about your business:
Access: System Menu → AI Assistant (requires AI Assistant chip if feature-gated)

Features:
• Ask questions about your sales, products, and customers
• AI analyzes your business data and provides insights
• Menu and pricing suggestions
• Customer behavior analysis
• Trend identification
• Revenue optimization recommendations

How to use:
1. Navigate to AI Assistant from System Menu
2. Type your question or select a suggested prompt
3. AI analyzes your merchant data (orders, products, customers)
4. Receive insights, charts, and recommendations
5. Use insights to optimize pricing, menu, and operations

Example questions:
• "What are my best-selling products this month?"
• "Which days have the highest sales?"
• "What's my average order value?"
• "Which customers haven't visited recently?"
• "Suggest a pricing strategy for slow-moving items"

Note: AI Assistant may require a chip unlock via the Motherboard/Marketplace.`
      },
      {
        title: 'AI Website Generator',
        content: `Generate a professional business website with AI:
Access: System Menu → AI Website Generator (requires Website Generator chip if feature-gated)

How it works:
1. Navigate to AI Website Generator
2. AI generates a website based on your:
   • Business name and description
   • Products and menu items
   • Business hours and contact info
   • Branding (logo, colors)
3. Review the generated website
4. Customize content and layout
5. Publish — website goes live
6. Share your website URL with customers
7. Online menu is automatically integrated

Managing Your Website:
• After generation, the tile changes to "Manage Website"
• View website analytics (visitors, page views)
• Update content and regenerate sections
• SEO optimization included
• Mobile-responsive design
• Custom domain support (Settings → Custom Domains)

Analytics Dashboard:
• Track visitors and page views
• See traffic sources
• Monitor popular pages
• Conversion tracking

Note: AI Website Generator may require a chip unlock via the Motherboard/Marketplace.`
      }
    ]
  },
  {
    id: 'referral',
    icon: UserPlus,
    title: 'Referral Program',
    color: 'text-purple-600',
    content: [
      {
        title: 'What is the Referral Program?',
        content: `Earn rewards by referring new merchants to openTILL:
• Share your unique referral code or link
• When a merchant signs up using your code, you earn rewards
• Track referral status from the Referral Dashboard
• Earn $DUC tokens or cash rewards for successful referrals

Access: System Menu → Referral Program`
      },
      {
        title: 'Sharing Your Referral Code',
        content: `How to refer merchants:
1. Navigate to System Menu → Referral Program
2. View your unique referral code and link
3. Share via:
   • Direct link (copy and paste)
   • QR code (scan to sign up)
   • Email or message
   • Social media
4. When a merchant clicks your link and signs up:
   • They are automatically attributed to you
   • You see them in your Referral Dashboard
   • Status tracks from signup → activation → reward

Tips:
• Share with business owners in your network
• Post in merchant communities
• Include in your email signature
• Print QR code on business cards`
      },
      {
        title: 'Tracking Referrals',
        content: `Monitor your referrals:
• Navigate to Referral Dashboard
• View all referred merchants:
  - Business name
  - Signup date
  - Status (pending, active, converted)
  - Reward earned
• See total referrals and total rewards
• Track conversion rate
• Export referral reports

Reward Structure:
• Rewards are configured by Super Admin
• Typically: $DUC tokens or cash bonus per activated merchant
• Some programs offer recurring commission on referral revenue
• Rewards appear in your $DUC Vault or are paid out per program rules`
      }
    ]
  },
  {
    id: 'device-monitor',
    icon: Activity,
    title: 'Device Monitor',
    color: 'text-violet-600',
    content: [
      {
        title: 'What is Device Monitor?',
        content: `Track and manage all active device sessions for your merchant:
• See which devices are currently connected (POS terminals, customer displays, kitchen displays, mobile stations)
• Monitor device type, location, and last activity
• Disconnect suspicious or stale sessions
• View device heartbeats and connection status

Access: System Menu → Device Monitor (admin access required)`
      },
      {
        title: 'Viewing Active Sessions',
        content: `Monitor connected devices:
1. Navigate to System Menu → Device Monitor
2. View all active device sessions:
   • Device type (POS, Customer Display, Kitchen Display, Mobile)
   • Device name/identifier
   • IP address (if available)
   • Last heartbeat timestamp
   • Connection status (active, stale, disconnected)
   • Station assignment (if applicable)
3. Filter by device type or status
4. Sort by last activity

Use this to:
• Verify all terminals are online before opening
• Identify stale connections consuming resources
• Audit which devices have accessed your system`
      },
      {
        title: 'Managing Sessions',
        content: `Control device access:
1. From Device Monitor, select a session
2. View session details:
   • Device info
   • Login time
   • User (if authenticated)
   • Activity log
3. Actions:
   • Disconnect session (force logout)
   • Block device (prevent reconnection)
   • View activity history
4. Use for:
   • Security: disconnect lost or stolen devices
   • Maintenance: clear stale connections
   • Auditing: review who accessed what and when

Note: Disconnecting a session immediately logs the device out. The device can reconnect unless blocked.`
      }
    ]
  },
  {
    id: 'dealer',
    icon: TrendingUp,
    title: 'Ambassador Program (Resellers)',
    color: 'text-emerald-600',
    content: [
      {
        title: 'What is an Ambassador?',
        content: 'Ambassador = openTILL\'s reseller partner program:\n• Ambassadors resell openTILL to merchants under their own brand\n• Earn commissions on merchant revenue\n• Custom branding (logo, colors, domain)\n• Manage your own merchant base\n• Dedicated Ambassador Dashboard\n• Stripe Connect payouts\n• Stripe Identity verification required for payouts\n\nIdeal for:\n• Payment processors\n• POS resellers\n• Business consultants\n• Technology partners\n• Marketing agencies\n\nAccess: Register at the Ambassador Portal on the homepage. Invite-only after approval.'
      },
      {
        title: 'Dealer Registration',
        content: 'Become a dealer:\n1. Visit Ambassador Hub\n2. Fill registration form:\n   • Company name\n   • Contact info\n   • Business details\n   • Estimated merchant count\n3. Submit application\n4. Super Admin reviews\n5. Approval + setup:\n   • Dealer account created\n   • Commission rates set\n   • Stripe Connect account created\n6. Access dealer dashboard\n7. Start onboarding merchants'
      },
      {
        title: 'Dealer Dashboard Features',
        content: 'Manage your business:\n• Overview:\n  - Total merchants\n  - Active merchants\n  - Monthly revenue\n  - Earned commissions\n• Merchant Management:\n  - View all your merchants\n  - See merchant status\n  - Impersonate for support\n  - Commission per merchant\n• Lead Management:\n  - Track prospects through your sales pipeline\n  - Log activities, notes, and appointments\n  - Convert leads to merchants\n• Commission Tracking:\n  - Real-time commission calculations\n  - Breakdown by merchant\n  - Payment history\n  - Pending payouts\n• Stripe Connect & Identity:\n  - Connect your Stripe account\n  - Complete Stripe Identity verification\n  - Automatic payouts (gated behind verified identity)\n  - View payout history\n• Branding:\n  - Upload your logo\n  - Set brand colors\n  - Custom subdomain\n  - Hide openTILL branding (optional)\n• Custom Domains:\n  - Use your own domain\n  - SSL certificates\n  - DNS management\n• Analytics:\n  - Merchant performance\n  - Revenue trends\n  - Growth metrics'
      },
      {
        title: 'Commission Structure',
        content: 'How you earn:\n\nCommission on:\n• Monthly subscription fees\n• Payment processing fees (if applicable)\n• Hardware sales (device shop)\n• Premium features (Motherboard)\n\nRates (set by Super Admin):\n• Typical: 10-30% of revenue\n• Tiered based on volume\n• Performance bonuses available\n• Signup bonus per new merchant\n• Active merchant bonus per period\n• Milestone bonus when threshold met\n\nPayout Schedule:\n• Monthly automatic payouts\n• Via Stripe Connect or Solana ($DUC)\n• Minimum payout threshold (e.g., $20)\n• Detailed statements provided\n• Payout hold days configurable\n\nView Commissions:\n• Dealer Dashboard → Commissions\n• Real-time tracking\n• Breakdown by merchant\n• Export reports'
      },
      {
        title: 'Lead Management',
        content: `Track prospects through your sales pipeline:
Access: Dealer Dashboard → Lead Management

Features:
• Add leads (prospects) with business name, contact info, and estimated value
• Track lead status: New → Contacted → Qualified → Proposal Sent → Converted / Lost
• Log activities per lead:
  - Notes, emails, calls, status changes
  - Appointments and meetings
• Schedule follow-ups with reminders
• Convert leads to merchants when they sign up
• View lead source (referral, website, social media, etc.)
• Filter and search leads
• Export lead reports

Sales Pipeline:
1. New lead added
2. Contact prospect (log call/email)
3. Qualify (assess fit, budget, timeline)
4. Send proposal
5. Convert to merchant (onboarding begins)
6. Or mark as lost (with reason)

Use lead management to:
• Never forget a prospect
• Track your conversion rate
• Schedule timely follow-ups
• Keep notes on every interaction`
      },
      {
        title: 'Stripe Identity Verification',
        content: `Verify your identity to enable payouts:
• Ambassadors must complete Stripe Identity verification before payouts are enabled
• This is a KYC (Know Your Customer) requirement for compliance
• Payouts are gated behind verified identity status

How to verify:
1. Dealer Dashboard → Payout Settings → Start Identity Verification
2. Stripe Identity session opens
3. Provide government-issued ID (driver's license, passport)
4. Take a selfie for identity matching
5. Stripe verifies and approves
6. Payouts are enabled automatically

Note: Identity verification is required for all payout methods (Stripe Connect, Solana, manual). Ambassadors cannot trigger their own payouts — only platform admins process payouts.`
      },
      {
        title: 'New Revenue Features',
        content: `Earn from the latest platform features:
• Motherboard Chips — commission on every chip merchants purchase (one-time and recurring)
• $DUC Vault — merchants stake $DUC for rewards; track adoption in your dashboard
• Affiliate Links — the Device Shop includes affiliate product links; configured by Super Admin
• Invoicing & Paylinks — merchants send invoices with online payment; volume counts toward commission
• Non-Integrated Terminal — premium NFT-gated chip; commission applies on purchase
• AI Assistant & Website Generator — premium chips; commission on purchase

All new feature revenue is included in your monthly commission calculations. Track from Dealer Dashboard → Commissions.`
      },
      {
        title: 'Onboarding Merchants',
        content: 'Add merchants to your portfolio:\n\n1. Share your Ambassador Hub:\n   • yourdomain.opentill-pos.com\n   • Branded registration form\n   • Or share your referral link/code\n\n2. Merchant registers:\n   • Fills onboarding form\n   • Automatically assigned to you\n   • No manual assignment needed\n\n3. Super Admin approves:\n   • Account activated\n   • Trial period starts\n\n4. Provide Support:\n   • Help merchant with setup\n   • Configure settings\n   • Train on features\n   • Ongoing support\n\n5. Earn Commissions:\n   • Automatic from day one\n   • Track in dealer dashboard'
      },
      {
        title: 'Custom Branding',
        content: 'Custom branding:\n\n1. Upload Your Logo:\n   • Dealer Dashboard → Branding\n   • Upload logo (PNG, SVG)\n   • Shows throughout merchant experience\n\n2. Set Brand Colors:\n   • Primary color\n   • Secondary color\n   • Applied to all UI elements\n\n3. Custom Domain:\n   • Use your own domain\n   • Example: pos.yourcompany.com\n   • Full SSL support\n\n4. Hide openTILL Branding:\n   • Toggle in dealer settings\n   • Removes "Powered by openTILL"\n   • Your brand only\n\n5. Custom Email Templates:\n   • Merchant welcome emails\n   • Receipt templates\n   • Notification emails\n   • All from your brand\n\nMerchants see your brand, not openTILL.'
      },
      {
        title: 'Dealer Support',
        content: 'Resources for dealers:\n• Dedicated support channel\n• Priority response times\n• Technical documentation\n• Sales materials:\n  - Brochures\n  - Presentations\n  - Pricing sheets\n  - Demo videos\n• Training sessions\n• Onboarding assistance\n• Marketing support\n• Co-marketing opportunities\n\nContact:\n• Dealer support email\n• Direct support line\n• Regular dealer calls'
      }
    ]
  },
  {
    id: 'troubleshooting',
    icon: HelpCircle,
    title: 'Troubleshooting',
    color: 'text-rose-600',
    content: [
      {
        title: 'Common Issues',
        content: 'Quick fixes:\n\nCannot Log In:\n• Verify PIN is 4 digits\n• Try email login instead\n• Check caps lock\n• Clear browser cache\n• Try different browser\n• Contact admin for PIN reset\n\nCard Reader Not Working:\n• Check power cable connected\n• Verify network cable (if ethernet)\n• Test internet connection\n• Verify IP address in settings\n• Restart card reader\n• Test connection in Settings\n• Contact hardware support\n\nProducts Not Showing:\n• Check product is active (not disabled)\n• Verify department filter not hiding it\n• Clear product filter/search\n• Refresh page (F5)\n• Clear browser cache\n• Check product assigned to department\n\nPayment Declined:\n• Verify card details correct\n• Check internet connection\n• Try different card\n• Verify payment gateway is enabled\n• Check gateway dashboard for errors\n• Contact payment processor'
      },
      {
        title: 'Performance Issues',
        content: 'System running slow:\n\n1. Browser Issues:\n   • Close unused tabs\n   • Clear cache and cookies\n   • Update browser to latest version\n   • Try different browser\n   • Disable browser extensions\n\n2. Internet Connection:\n   • Test speed (speedtest.net)\n   • Restart router/modem\n   • Switch to ethernet if on WiFi\n   • Contact ISP\n\n3. Device Performance:\n   • Restart tablet/computer\n   • Close background apps\n   • Free up storage space\n   • Update operating system\n\n4. Server Issues:\n   • Check status.opentillpos.com\n   • Platform maintenance\n   • Wait and retry\n\nIf persistent, contact support with details.'
      },
      {
        title: 'Printing Issues',
        content: 'Receipt not printing:\n\n1. Check Printer:\n   • Power on\n   • Paper loaded correctly\n   • Paper not jammed\n   • Thermal paper (not faded)\n   • Cover closed properly\n\n2. Connection:\n   • USB cable secure\n   • Or check network cable\n   • Verify printer IP in settings\n   • Ping printer IP\n\n3. Test Print:\n   • Settings → Devices → Printers\n   • Click "Test Print"\n   • If works, issue is in POS\n   • If fails, hardware/connection issue\n\n4. Driver:\n   • Update printer driver\n   • Reinstall driver\n   • Try different USB port\n\n5. Paper Roll:\n   • Replace with new thermal paper\n   • Check orientation\n   • Ensure proper width (58mm or 80mm)\n\n6. Reset Printer:\n   • Power off\n   • Wait 30 seconds\n   • Power on\n   • Test again'
      },
      {
        title: 'Sync Issues',
        content: 'Data not syncing:\n\n1. Check Internet:\n   • Verify connection\n   • Test speed\n   • Restart router\n\n2. Verify Account:\n   • Confirm logged in\n   • Check account status (not suspended)\n   • Verify subscription active\n\n3. Force Refresh:\n   • Press F5 or Ctrl+R\n   • Or pull down to refresh on mobile\n\n4. Clear Cache:\n   • Browser settings\n   • Clear cached data\n   • Reload page\n\n5. Log Out/In:\n   • Sign out completely\n   • Close browser\n   • Open and log in again\n\n6. Different Device:\n   • Try accessing from another device\n   • If works there, issue with original device\n   • If not, server-side issue\n\n7. Contact Support:\n   • If still not syncing\n   • Provide details:\n     - What is not syncing\n     - When started\n     - Error messages\n     - Screenshots'
      },
      {
        title: 'Payment Gateway Errors',
        content: 'Payment processing failures:\n\n1. Gateway Connection Failed:\n   • Verify API keys correct\n   • Check test/live mode matches keys\n   • Test connection in settings\n   • Check gateway dashboard for issues\n   • Verify account in good standing\n\n2. Transaction Declined:\n   • Not a openTILL issue\n   • Customer card declined by bank\n   • Try different card\n   • Check card not expired\n   • Verify sufficient funds\n\n3. Gateway Timeout:\n   • Internet connection issue\n   • Try again\n   • If persists, switch to backup gateway\n   • Contact gateway support\n\n4. Invalid Merchant Account:\n   • Gateway account suspended\n   • Verification needed\n   • Contact gateway directly\n\n5. API Error:\n   • Check gateway status page\n   • May be down for maintenance\n   • Try different gateway\n   • Contact openTILL support'
      },
      {
        title: 'Wallet Connection Issues',
        content: 'Solana wallet not connecting:\n\n1. Wallet Not Detected:\n   • Install wallet extension (Phantom, Solflare)\n   • Refresh page after install\n   • Try different browser\n   • Check wallet is unlocked\n\n2. Connection Rejected:\n   • Wallet popup blocked?\n   • Allow popups in browser\n   • Try again\n   • Approve connection in wallet\n\n3. Wrong Network:\n   • Switch to Mainnet (or Devnet for testing)\n   • In wallet settings\n   • Reconnect\n\n4. NFT Not Recognized:\n   • Verify NFT in wallet\n   • Check correct wallet connected\n   • Refresh/reconnect wallet\n   • Clear cache\n\n5. Transaction Failed:\n   • Insufficient SOL for gas\n   • Add SOL to wallet\n   • Try again\n   • Increase slippage if swapping\n\n6. SMPF Wallet Balance Not Loading:\n   • Refresh the page\n   • Check internet connection\n   • $DUC balances are fetched server-side (most reliable)\n   • SOL/other tokens fetched via browser RPC (may have CORS issues)\n   • Contact admin if RPC endpoints are down'
      },
      {
        title: 'Getting Help',
        content: 'Support channels:\n\n1. Support Tickets:\n   • Navigate to Support page\n   • Click "Submit Ticket"\n   • Describe issue in detail\n   • Attach screenshots\n   • Response within 24 hours\n\n2. Phone/Text:\n   • Call or text: 419-729-3889\n   • Business hours: Mon-Fri 9am-5pm EST\n   • Leave voicemail after hours\n\n3. Email:\n   • support@openTILL.io\n   • Include:\n     - Merchant name\n     - Issue description\n     - Steps to reproduce\n     - Screenshots/videos\n   - Response within 24 hours\n\n4. User Manual:\n   • This guide\n   • Search for topics\n   • Step-by-step tutorials\n\n5. Video Tutorials:\n   • Coming soon\n   • YouTube channel\n\n6. Community Forum:\n   • Future feature\n   • Connect with other merchants'
      }
    ]
  },
  {
    id: 'faq',
    icon: HelpCircle,
    title: 'FAQ',
    color: 'text-blue-500',
    content: [
      {
        title: 'How do I reset an employee PIN?',
        content: 'Navigate to Users page → Select employee → Click "Edit" → Enter new 4-digit PIN → Save. Employee can now login with new PIN. Or Super Admin can use PIN Reset Tool.'
      },
      {
        title: 'Can I accept both card and crypto payments?',
        content: 'Yes! Enable card payments in Settings → Payment Gateways (Stripe, Square, etc.) and enable crypto in Settings → Solana Pay. Customers choose their preferred method at checkout. Both methods work simultaneously.'
      },
      {
        title: 'How do refunds work?',
        content: 'Navigate to Orders → Find transaction → Click order to view details → Click "Refund" button → Select full or partial refund → Enter reason (optional) → Process refund. Refund is processed through original payment gateway. Customer receives refund in 5-10 business days for cards, instantly for crypto/cash.'
      },
      {
        title: 'What if my card reader is not connecting?',
        content: 'Check: 1) Device powered on, 2) Cables secure, 3) IP address correct in Settings → Devices, 4) Test connection. If network reader, verify on same network. Restart reader. If issues persist, contact Device Shop support for hardware troubleshooting.'
      },
      {
        title: 'How do I add a custom domain?',
        content: 'Settings → Custom Domains → Click "Add Domain" → Enter domain (e.g., pos.mystore.com) → Choose domain type (POS, Online Ordering, or Both) → Follow DNS setup instructions provided → Add CNAME and TXT records at your domain registrar → Click "Verify Domain" → SSL certificate auto-provisions → Domain status shows "Active"'
      },
      {
        title: 'Can I track employee hours?',
        content: 'Yes! Employees clock in/out with PIN login. View all time entries in Users → Time Tracking tab. Edit entries (admin only), add manual entries, export timesheet reports for payroll. Calculate regular hours, overtime, and breaks.'
      },
      {
        title: 'How do I set up online ordering?',
        content: 'Settings → Online Ordering → Enable Online Ordering → Configure delivery/pickup options, operating hours, minimum order → Set up payment methods → Brand your menu (logo, colors) → Get your unique menu URL → Share with customers. Orders appear in "Online Orders" section.'
      },
      {
        title: 'What is the difference between Super Admin and Merchant Admin?',
        content: 'Super Admin: Platform team members (openTILL staff) with access to all merchants, system configuration, and platform-wide settings. Used for support and management.\n\nMerchant Admin: Business owner/manager with full access to their own merchant account only. Can manage products, employees, settings, but cannot access other merchants or platform settings.'
      },
      {
        title: 'How do I export sales data?',
        content: 'Reports → Sales Reports → Select date range (today, week, month, or custom) → View charts and data → Click "Export" button → Choose format (CSV for spreadsheets, PDF for printing) → Download file. CSV can be opened in Excel, Google Sheets, etc.'
      },
      {
        title: 'Can I use multiple locations?',
        content: 'Yes! Multi-location feature available via Motherboard (requires Multi-Location NFT). Each location has its own products, inventory, and settings. Transfer stock between locations. Consolidated reporting across all locations. Contact Super Admin for setup assistance.'
      },
      {
        title: 'How secure is openTILL POS?',
        content: 'openTILL uses:\n• Bank-level encryption (TLS/SSL)\n• PCI-DSS compliant payment processing\n• Secure blockchain transactions\n• Regular security audits\n• Data backup and redundancy\n• Role-based access control with granular permissions\n• Audit logging\n• Optional 2FA (Settings → Two-Factor Auth)\n• Staff PIN-based access control\n• Stripe Identity verification for ambassadors/builders\n• Non-custodial wallet (private keys encrypted locally)'
      },
      {
        title: 'What devices are compatible?',
        content: 'openTILL works on any device with a modern web browser:\n• Desktop: Windows, Mac, Linux, Chrome OS\n• Tablets: iPad, Android tablets (recommended: 10"+)\n• Smartphones: iOS, Android (for managers/mobile POS)\n• All-in-one POS terminals\n• Touch screen displays\n• Minimum: Dual-core processor, 4GB RAM, internet connection'
      },
      {
        title: 'How does $DUC Vault work?',
        content: 'Earn cryptocurrency rewards for processing credit card payments. Earn 0.5% of your monthly CC volume in $DUC tokens. First, connect a Solana wallet in Settings → Wallet & Payments, or use the built-in SMPF Wallet. Then access $DUC Vault from System Menu. Claim rewards to your wallet, stake for APY (up to 20%), or swap for USDC via Jupiter. Rewards are calculated automatically at month-end. A minimum claim threshold applies.'
      },
      {
        title: 'What is the SMPF Wallet?',
        content: 'The SMPF Wallet is a non-custodial Solana wallet built into openTILL. Create and manage your wallet directly in the app — no browser extension needed. Hold SOL, $DUC, and other SPL tokens. Send/receive crypto, swap via Jupiter, view NFTs, and export private keys for use with Phantom/Solflare. Your private keys are encrypted and stored locally on your device. One wallet per email account. Back up your encrypted backup file — vanity address wallets are NOT recoverable via seed phrase.'
      },
      {
        title: 'What is Motherboard?',
        content: 'Motherboard is openTILL\'s modular chip-based feature system. Purchase Chips (feature upgrades) with $DUC tokens to unlock advanced capabilities like AI Assistant, Advanced Analytics, Website Generator, Multi-Location, and more. Connect your Solana wallet, browse chips in the Marketplace, and purchase what you need. One-time chips unlock features permanently; subscription chips require ongoing payment. Features activate instantly.'
      },
      {
        title: 'How do I get a .opentill-pos.sol subdomain?',
        content: 'Request during merchant onboarding or later in Settings → General. Choose your preferred name (letters, numbers, hyphens). Submit request. Super Admin approves and generates subdomain. Use for branding, online menu, and Web3 identity. Link to Solana wallet for crypto payments. No renewal fees.'
      },
      {
        title: 'Can I customize openTILL with my brand?',
        content: 'Ambassadors can fully customize branding: Upload logo, set brand colors, use custom domain, optionally hide openTILL branding. Requires an approved Ambassador account. Merchants see your brand throughout the platform. Custom email templates available. Contact Super Admin or register at the Ambassador Portal on the homepage.'
      },
      {
        title: 'How do I become an Ambassador/reseller?',
        content: 'Visit the Ambassador Portal on the homepage → Fill registration form → Submit application → Super Admin reviews and approves → Ambassador account created → Commission rates set → Complete Stripe Identity verification → Connect Stripe for payouts → Access Ambassador Dashboard → Start onboarding merchants → Earn commissions on merchant revenue. Ideal for payment processors, POS resellers, and business consultants.'
      },
      {
        title: 'What payment gateways are supported?',
        content: 'Supported gateways:\n• openTILL Payments (Powered by Stripe) — managed, no own account needed, includes Stripe Terminal\n• Stripe (recommended - easy setup)\n• Square (all-in-one with hardware)\n\nConfigure in Settings → Payment Gateways. Can enable multiple and set default. Stripe/Square require API credentials; openTILL Payments uses guided Stripe Connect onboarding.'
      },
      {
        title: 'How do I handle age-restricted items?',
        content: 'Mark products as "Age Restricted" in product settings. Set minimum age (18 or 21). When added to cart, system prompts for verification. Options: Scan ID, Manual Entry, Visual Check. Record ID last 4 digits. Cannot proceed without verification. Verification data stored in order history for compliance audits.'
      },
      {
        title: 'Can customers pay with EBT/SNAP?',
        content: 'Yes! Mark eligible food products as "EBT Eligible" in product settings. System auto-calculates eligible vs non-eligible amounts. At checkout, select EBT payment. Only eligible items charged to EBT card. Separate payment for non-eligible items (alcohol, prepared foods, etc.). Record approval codes. Compliance reporting available.'
      },
      {
        title: 'How do I set up modifiers for my products?',
        content: 'Navigate to System Menu → Modifiers → Create a modifier group (e.g., "Size") → Add options (Small, Medium, Large) with price adjustments → Choose single or multi selection → Set min/max required → Apply to all products, specific products, or departments. On the POS, tap an item in the cart to select modifiers. Modifiers appear on receipts and kitchen tickets.'
      },
      {
        title: 'How do I use my phone as a customer display?',
        content: 'Set up a Station with mobile access: Settings → Devices → Stations → Create or edit a station → Enable "Mobile Access" → Generate a mobile station token → Open the mobile URL (/mobile/station/<token>) on any phone or tablet. The display shows items, prices, payment prompts, and transaction status. Optionally set a station PIN for cashier controls. Regenerate the token at any time to invalidate old URLs.'
      },
      {
        title: 'Can I generate a website for my business?',
        content: 'Yes! Navigate to System Menu → AI Website Generator. AI generates a professional website based on your business info, products, and branding. Review, customize, and publish. View analytics, update content, and use a custom domain. May require a Website Generator chip unlock via the Motherboard/Marketplace.'
      }
    ]
  }
];