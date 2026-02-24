import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  CreditCard,
  Package,
  Users,
  Settings,
  BarChart3,
  Globe,
  Smartphone,
  HelpCircle,
  ShoppingBag,
  Shield,
  Zap,
  Monitor,
  TrendingUp,
  FileText,
  Wallet,
  Crown,
  Link2,
  DollarSign,
  Truck
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function UserManual() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
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
          content: 'The System Menu is your central hub with:\n• POS - Process customer orders\n• Products - Manage catalog and inventory\n• Customers - Customer database and loyalty\n• Orders - View order history\n• Online Orders - Manage web/app orders\n• Reports - Analytics and insights\n• Departments - Organize products\n• Settings - System configuration (staff, payments, devices, pricing, etc.)\n• Marketplace - Browse and purchase chip-based feature upgrades\n• Device Shop - Purchase hardware\n• $cLINK Vault - Cryptocurrency rewards for CC processing\n• Motherboard - Chip-based premium features\n• Referral Dashboard - Track and manage your referrals\n• Support - Help and documentation'
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
          content: 'ChainLINK supports multiple payment types:\n\n• Cash - Manual cash transactions with change calculation\n• Card - Credit/Debit via Stripe, Square, or other gateways\n• EBT/SNAP - For eligible food items only (auto-calculates eligible items)\n• Solana Pay - Cryptocurrency via QR code (USDC or custom tokens)\n• Split Payment - Combine multiple methods (e.g., EBT + Card for non-eligible items)\n\nAll transactions are recorded in Order History with full details.'
        },
        {
          title: 'Dual Pricing & Surcharges',
          content: 'Display cash and non-cash prices:\n• Cash Price - Base price for cash/EBT payments\n• Non-Cash Price - Includes surcharge for card payments\n\nConfiguration:\n• Enable in Settings → Pricing & Surcharge\n• Set surcharge percentage (e.g., 3.5%)\n• Choose pricing mode (surcharge or cash discount)\n• Select region (US, CA, Other)\n• Option to show both prices on display\n\nPOS automatically calculates and applies correct pricing based on selected payment method.'
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
          content: 'Add customization options:\n• Configure in product settings\n• Create modifier groups (Size, Toppings, Extras)\n• Set price adjustments (+$1.50, -$0.50)\n• Choose modifier type (add, remove, substitute)\n\nOn POS:\n• Click item in cart to add modifiers\n• Select from configured options\n• Price updates automatically\n• Modifiers show on receipt and kitchen display'
        },
        {
          title: 'Customer Display Integration',
          content: 'Show order to customers in real-time:\n1. Open customer display URL on secondary screen/tablet\n2. Display shows:\n   • Items added to cart\n   • Prices and totals\n   • Dual pricing if enabled\n   • Payment method selection\n   • Tip screen\n   • Transaction status\n3. Updates automatically as cashier works\n4. Branded with your logo and colors\n\nGet URL from Settings → Customer Display'
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
          content: 'STEP 1: Navigate to Products\n• From System Menu, click "Products"\n• View existing catalog\n\nSTEP 2: Create New Product\n• Click "+ Add Product" button\n• Product form appears\n\nSTEP 3: Basic Information (Required)\n• Product Name - Display name\n• Price - Base price before tax\n• Department - Select from dropdown\n\nSTEP 4: Optional Details\n• SKU - Stock keeping unit for tracking\n• Barcode - For scanner lookup\n• Description - Shows on online menu and receipts\n\nSTEP 5: Upload Image\n• Click "Upload Image" or drag & drop\n• Recommended: 800x800px, JPG/PNG\n• Image shows on POS and online menu\n\nSTEP 6: Configure Options\n• EBT Eligible - Food items qualifying for SNAP\n• Age Restricted - Alcohol, tobacco, vape products\n• Tippable - Allow tips for this item\n• Set minimum age if restricted (18 or 21)\n\nSTEP 7: Inventory Settings\n• Current stock quantity\n• Low stock alert threshold\n• System alerts when below threshold\n\nSTEP 8: Add Modifiers\n• Click "Add Modifier Group"\n• Example: "Size" with options Small/Medium/Large\n• Set price adjustments for each option\n• Multiple modifier groups allowed\n\nSTEP 9: Save\n• Click "Save Product"\n• Product now available on POS\n• Appears in department filter'
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
          content: 'Store customer information:\n• Navigate to Customers page\n• Click "Add Customer" for new customer\n• Enter details:\n  - Full name (required)\n  - Email address\n  - Phone number\n  - Preferred payment method\n  - Custom notes\n• System automatically tracks:\n  - Total spent (lifetime value)\n  - Visit count\n  - Loyalty points balance\n  - Last visit date\n• Search customers by name, email, or phone\n• Edit or delete customer records'
        },
        {
          title: 'Loyalty Program',
          content: 'Reward repeat customers:\n1. Enable in Settings → Loyalty Program\n2. Configure:\n   • Points per dollar spent\n   • Dollar value per point\n   • Minimum redemption amount\n3. Customers earn automatically:\n   • Points calculated on each purchase\n   • Shown on receipt\n4. Redeem points:\n   • Select customer on POS\n   • Points available as discount\n   • Deducted from balance\n5. Track in Reports:\n   • Points issued\n   • Points redeemed\n   • Customer loyalty rankings'
        },
        {
          title: 'Customer Lookup on POS',
          content: 'Quick customer search during checkout:\n1. Click "Select Customer" button on POS\n2. Search by:\n   • Name\n   • Phone number\n   • Email address\n3. Customer profile displays:\n   • Contact info\n   • Loyalty points balance\n   • Total purchases\n   • Last visit\n4. Select to apply to current order\n5. Loyalty points auto-calculated\n6. Customer info printed on receipt'
        },
        {
          title: 'Customer Display',
          content: 'Customer-facing screen:\n• Set up secondary display (tablet, monitor)\n• Open customer display URL\n• Shows real-time:\n  - Welcome screen with logo\n  - Items being added to cart\n  - Prices and totals\n  - Payment method selection\n  - Tip screen (if enabled)\n  - Transaction status\n  - Thank you message\n• Fully branded with your colors\n• Touch-enabled for customer input\n• Get URL from Settings → Customer Display'
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
          content: 'STEP 1: Get Stripe Account\n• Sign up at stripe.com\n• Complete business verification\n• Navigate to Developers → API Keys\n\nSTEP 2: Get API Credentials\n• Copy "Publishable key" (starts with pk_)\n• Copy "Secret key" (starts with sk_)\n• Use test keys for testing, live keys for production\n\nSTEP 3: Configure in ChainLINK\n• Settings → Payment Gateways → Stripe\n• Paste Publishable Key\n• Paste Secret Key\n• Select Test Mode or Live Mode\n\nSTEP 4: Test Connection\n• Click "Test Connection" button\n• Green checkmark = success\n• Red X = recheck keys\n\nSTEP 5: Enable\n• Toggle "Enabled" switch\n• Save settings\n• Stripe now active for card payments\n\nSTEP 6: Test Transaction\n• Process small test order\n• Use Stripe test card: 4242 4242 4242 4242\n• Verify transaction in Stripe dashboard'
        },
        {
          title: 'Payment Gateway Setup - Square',
          content: 'STEP 1: Get Square Account\n• Sign up at squareup.com\n• Complete business setup\n• Navigate to Developer Dashboard\n\nSTEP 2: Create Application\n• Create new application\n• Get Access Token\n• Get Location ID (from Locations)\n\nSTEP 3: Configure in ChainLINK\n• Settings → Payment Gateways → Square\n• Paste Access Token\n• Paste Location ID\n• Select Sandbox or Production\n\nSTEP 4: Test & Enable\n• Test connection\n• Enable gateway\n• Square hardware auto-syncs'
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
          content: 'STEP 1: Enable Feature\n• Settings → Online Ordering\n• Toggle "Enable Online Ordering"\n\nSTEP 2: Fulfillment Options\n• Enable Pickup: Allow customer pickup\n• Enable Delivery: Offer delivery service\n• Set delivery radius (miles)\n• Set delivery fee\n• Set minimum order amounts\n\nSTEP 3: Operating Hours\n• Enter business hours per day\n• Set special holiday hours\n• Orders only accepted during open hours\n• Display estimated wait time\n\nSTEP 4: Payment Options\n• Allow cash on pickup (toggle)\n• Enable card payments (requires gateway)\n• Enable crypto payments (if Solana Pay enabled)\n\nSTEP 5: Branding\n• Upload logo\n• Set primary and secondary colors\n• Add welcome message\n• Add special instructions\n• Configure menu layout\n\nSTEP 6: Menu Configuration\n• Choose which products appear online\n• Set online-only pricing (if different)\n• Add product photos (highly recommended)\n• Write descriptions\n• Configure modifiers\n\nSTEP 7: Get Your URL\n• Copy unique menu URL\n• Format: yourbusiness.chainlink-pos.com\n• Or set up custom domain (Settings → Custom Domains)\n\nSTEP 8: Promote Your Menu\n• Add link to website\n• Share on social media (Facebook, Instagram)\n• Print QR code on receipts/menus\n• Add to Google My Business\n• Email to customer list'
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
          content: 'Connect third-party delivery platforms:\n\nAvailable Integrations:\n• DoorDash - Wide coverage, fast delivery\n• Grubhub - Restaurant-focused platform\n• Uber Eats - Large customer base\n• Takeout7 - Regional service\n\nSetup Process:\n1. Navigate to Marketplace page\n2. Click "Connect" on desired platform\n3. Follow OAuth connection flow\n4. Enter API credentials\n5. Map your menu to their platform\n6. Configure pricing and availability\n7. Enable auto-accept or manual review\n\nBenefits:\n• Orders sync automatically to ChainLINK\n• Menu updates push to all platforms\n• Unified order management\n• Consolidated reporting\n• Single POS for all orders'
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
          content: 'Employee time management:\n\nClock In:\n1. Employee opens ChainLINK\n2. Clicks "PIN Login"\n3. Enters 4-digit PIN\n4. System records clock-in time\n5. Employee can now work\n\nClock Out:\n1. From System Menu, click profile\n2. Select "Clock Out"\n3. Confirm action\n4. System records clock-out time\n5. Session ends\n\nManagement:\n• Navigate to Users → Time Tracking tab\n• View all clock in/out records\n• Edit entries (admin only)\n• Add manual entries\n• Approve/reject timesheets\n• Export for payroll\n• Calculate hours:\n  - Regular hours\n  - Overtime\n  - Break time\n  - Total per pay period\n\nReports:\n• Hours by employee\n• Hours by date range\n• Cost of labor\n• Compare scheduled vs actual'
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
          content: 'Configure payment processors:\n• Navigate to Settings → Payment Gateways\n• Available gateways:\n  - Stripe (recommended)\n  - Square\n  - PayPal\n  - Authorize.net\n• For each gateway:\n  1. Enter API credentials\n  2. Select test/live mode\n  3. Test connection\n  4. Enable/disable\n  5. Set as default (if multiple)\n• Save all changes\n• Test with small transaction\n\nSee "Payment Processing" section for detailed setup.'
        },
        {
          title: 'Pricing & Surcharge',
          content: 'Configure dual pricing:\n\nDual Pricing Settings:\n• Enable Dual Pricing - Toggle on/off\n• Surcharge Percentage - e.g., 3.5%\n• Flat Fee Amount - Additional fixed fee\n• Apply Flat Fee to All - Even cash payments\n• Show Dual Prices - Display both on POS\n• Region - US, CA, or Other (compliance)\n• Pricing Mode:\n  - Surcharge: Higher price for cards\n  - Cash Discount: Lower price for cash\n\nHow it works:\n• Base price is cash price\n• Card payments add surcharge\n• Displayed clearly to customer\n• Surcharge shown separately on receipt\n• Compliant with card network rules'
        },
        {
          title: 'Customer Display',
          content: 'Configure customer-facing screen:\n• Settings → Customer Display\n• Enable customer display\n• Copy unique display URL\n• Branding:\n  - Upload logo\n  - Set colors\n  - Welcome message\n• Display options:\n  - Show item images\n  - Show pricing details\n  - Show dual pricing\n  - Enable tips on display\n  - Show payment instructions\n• Get URL and open on secondary screen/tablet\n• Display auto-syncs with POS'
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
          content: 'Link blockchain wallets:\n• Settings → Web3 Identity\n• Connect Wallet button\n• Choose wallet:\n  - Phantom\n  - Solflare\n  - Jupiter\n  - Mobile wallets\n• Approve connection\n• Sign message to verify ownership\n• Wallet linked to your account\n• Benefits:\n  - Web3 authentication\n  - Access Motherboard features\n  - $cLINK Vault\n  - NFT-gated features\n• Can link multiple wallets\n• Disconnect anytime'
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
          content: 'ChainLINK works on any device:\n\nPOS Terminal:\n• Tablet: iPad, Android tablet (10"+ recommended)\n• Desktop: Windows, Mac, Linux\n• All-in-one POS systems\n• Minimum: Dual-core processor, 4GB RAM\n\nCard Readers:\n• Verifone VX520 (recommended)\n• Clover terminals\n• PAX devices\n• Square reader\n• Ellipal crypto terminal\n\nReceipt Printers:\n• Epson TM-T88VI (thermal)\n• Star Micronics TSP143IIIBI\n• Any ESC/POS compatible\n\nBarcode Scanners:\n• Zebra DS2208\n• Honeywell Voyager 1250g\n• Any USB HID scanner\n• Camera-based scanning (built-in)\n\nCash Drawer:\n• APG Vasario Series\n• Star Micronics CD series\n• Any RJ11/RJ12 compatible\n\nCustomer Display:\n• 7"-10" tablet\n• Secondary monitor\n• Any device with web browser'
        },
        {
          title: 'Card Reader Setup',
          content: 'Connect payment terminal:\n\nUSB Connection:\n1. Plug card reader into USB port\n2. Install driver if prompted\n3. Settings → Devices → Card Readers\n4. Add device, select USB\n5. Test connection\n\nEthernet/WiFi Connection:\n1. Connect reader to network\n2. Note reader IP address (usually on screen)\n3. Settings → Devices → Card Readers\n4. Add device, select Network\n5. Enter IP address and port\n6. Test connection\n7. Process test transaction\n\nSupported readers:\n• Verifone: VX520, VX680, VX820\n• Clover: Mini, Flex, Station\n• PAX: S80, S300, A920\n• Square: Reader, Terminal\n• Ellipal: For crypto payments'
        },
        {
          title: 'Receipt Printer Setup',
          content: 'Configure receipt printing:\n\nUSB Thermal Printer:\n1. Connect via USB\n2. Install driver (Windows/Mac)\n3. Settings → Devices → Printers\n4. Add printer\n5. Select USB, choose from list\n6. Configure:\n   - Paper width (58mm or 80mm)\n   - Print speed\n   - Darkness\n7. Test print\n8. Enable auto-print (optional)\n\nNetwork Printer:\n1. Connect printer to network\n2. Note printer IP address\n3. Settings → Devices → Printers\n4. Add printer, select Network\n5. Enter IP address\n6. Test print\n\nKitchen Printer:\n• Follow same setup steps\n• Assign as "Kitchen Printer"\n• Set to print when "Send to Kitchen" clicked\n• Larger text for readability\n• Auto-cut between orders'
        },
        {
          title: 'Barcode Scanner Setup',
          content: 'Configure barcode scanning:\n\nUSB Scanner (Plug & Play):\n1. Plug scanner into USB port\n2. No configuration needed\n3. ChainLINK auto-detects\n4. Test scan on POS or Products page\n5. Supported formats: UPC, EAN, Code 39, Code 128\n\nBluetooth Scanner:\n1. Put scanner in pairing mode\n2. Device Bluetooth settings\n3. Pair with scanner\n4. ChainLINK auto-detects\n5. Test scan\n\nCamera Scanner:\n• Built-in to ChainLINK\n• Click camera icon on POS\n• Allow camera access\n• Point at barcode\n• Auto-scans and adds product\n\nWorks for:\n• Adding products to cart\n• Looking up product info\n• Creating new products'
        },
        {
          title: 'Cash Drawer Setup',
          content: 'Connect cash drawer:\n\n1. Cash drawer connects to receipt printer:\n   • Uses RJ11 or RJ12 cable\n   • Plug into printer "Cash Drawer" port\n\n2. Configure drawer behavior:\n   • Settings → Devices → Cash Drawer\n   • Auto-open on cash sale (toggle)\n   • Auto-open on shift start (toggle)\n   • Manual open button (for managers)\n\n3. Cash Management:\n   • Record opening float\n   • Track cash in/out\n   • Closing count\n   • Variance reports\n   • Bank deposits\n\n4. Security:\n   • Only managers can open drawer\n   • All opens logged\n   • Audit trail'
        },
        {
          title: 'Customer Display Setup',
          content: 'Set up customer-facing screen:\n\n1. Get a secondary display:\n   • Tablet (iPad, Android)\n   • Monitor\n   • TV\n   • Any device with browser\n\n2. Get Display URL:\n   • Settings → Customer Display\n   • Copy unique URL\n\n3. Open on Display:\n   • Open browser on display device\n   • Navigate to URL\n   • Bookmark it\n   • Set full-screen mode (F11 or browser setting)\n\n4. Position Display:\n   • Face toward customer\n   • At comfortable viewing angle\n   • Secure to prevent theft\n\n5. Display shows:\n   • Welcome screen with logo\n   • Items as added\n   • Prices and totals\n   • Payment prompts\n   • Thank you message\n\n6. Updates automatically as cashier works\n7. Touch-enabled for customer input (tips, signatures)'
        },
        {
          title: 'Kitchen Display Setup',
          content: 'Set up kitchen screen:\n\n1. Get Kitchen Display:\n   • Large tablet (12"+)\n   • Monitor or TV\n   • Wall-mountable recommended\n\n2. Get Display URL:\n   • Settings → Kitchen Display\n   • Copy unique URL\n\n3. Open on Display:\n   • Open browser\n   • Navigate to URL\n   • Full-screen mode\n   • Mount in kitchen area\n\n4. Configure Layout:\n   • Grid or list view\n   • Group by station\n   • Order of stations\n   • Audio alerts\n\n5. Usage:\n   • Orders appear when sent from POS\n   • Large, readable text\n   • Color-coded by status:\n     - New: Red\n     - In Progress: Yellow\n     - Ready: Green\n   • Touch items to mark complete\n   • Auto-advances to next order\n\n6. Multiple Displays:\n   • Separate URL per station\n   • Grill, Fryer, Salad, Drinks, etc.\n   • Filter items by station'
        }
      ]
    },
    {
      id: 'vault',
      icon: Wallet,
      title: '$cLINK Vault (Crypto Rewards)',
      color: 'text-yellow-600',
      content: [
        {
          title: 'What is $cLINK Vault?',
          content: 'Cryptocurrency rewards program for openTILL merchants:\n• Earn $cLINK tokens for processing credit card payments\n• Earn 0.5% of your monthly CC processing volume in $cLINK\n• Stake $cLINK to earn APY (up to 20% for 365-day lockup)\n• Swap $cLINK for USDC or other tokens via Jupiter DEX\n• Rewards calculated automatically at month-end\n\nExample:\n• Process $10,000 in card payments\n• Earn 0.5% = $50 worth of $cLINK\n• Stake for 12% APY\n• Compound rewards monthly\n\nAccess: Navigate to "$cLINK Vault" from System Menu\n\nRequirement: Connect a Solana wallet in Settings → Wallet & Payments first'
        },
        {
          title: 'Earning Rewards',
          content: 'How rewards work:\n\n1. Automatic Calculation:\n   • System tracks credit card processing volume\n   • Calculates rewards at month end\n   • Rewards appear in "Pending" status\n\n2. Reward Types:\n   • Processing Volume - 0.5% of CC volume\n   • Bonus - Platform bonuses\n   • Referral - Refer other merchants\n   • Staking Yield - Interest on staked tokens\n\n3. View Rewards:\n   • Navigate to $cLINK Vault\n   • See pending and available rewards\n   • View earning history\n   • Track total earned\n\n4. Minimum Claim:\n   • Must accumulate minimum amount (e.g., 10 $cLINK)\n   • Prevents excessive transaction fees\n   • Configure threshold in settings'
        },
        {
          title: 'Claiming Rewards',
          content: 'Claim your $cLINK:\n\n1. Connect Wallet:\n   • Click "Connect Wallet" in Vault\n   • Choose wallet (Phantom, Solflare, etc.)\n   • Approve connection\n\n2. Claim Tokens:\n   • View available rewards\n   • Click "Claim Rewards" button\n   • Approve transaction in wallet\n   • Tokens sent to your wallet\n   • Usually takes 30-60 seconds\n\n3. Transaction Record:\n   • Solana transaction signature provided\n   • Verify on Solscan or Solana Explorer\n   • Claim history in Vault\n\n4. What to Do with $cLINK:\n   • Hold for potential appreciation\n   • Stake for APY\n   • Swap for USDC or other tokens\n   • Use for platform benefits (future features)'
        },
        {
          title: 'Staking $cLINK',
          content: 'Earn passive income:\n\n1. Stake Tokens:\n   • Navigate to $cLINK Vault → Staking tab\n   • Enter amount to stake\n   • Choose lockup period:\n     - 30 days: 8% APY\n     - 90 days: 12% APY\n     - 180 days: 15% APY\n     - 365 days: 20% APY\n   • Click "Stake"\n   • Approve in wallet\n\n2. Staking Benefits:\n   • Earn interest on locked tokens\n   • Compound rewards automatically\n   • Early unlock penalty: 10%\n\n3. View Stakes:\n   • Active stakes\n   • Earned rewards\n   • Unlock dates\n   • Total staked amount\n\n4. Unstaking:\n   • Wait for lockup period\n   • Click "Unstake"\n   • Approve transaction\n   • Tokens + rewards returned to wallet'
        },
        {
          title: 'Swapping via Jupiter',
          content: 'Trade $cLINK for other tokens:\n\n1. Navigate to Swap Tab:\n   • $cLINK Vault → Swap\n\n2. Select Tokens:\n   • From: $cLINK\n   • To: USDC, SOL, or other SPL token\n\n3. Enter Amount:\n   • Amount of $cLINK to swap\n   • System shows estimated receive amount\n   • Includes slippage and fees\n\n4. Review & Swap:\n   • Check exchange rate\n   • Review network fee\n   • Click "Swap"\n   • Approve in wallet\n   • Swap executes on Jupiter DEX\n   • Tokens arrive in wallet\n\n5. Powered by Jupiter:\n   • Best rates from all Solana DEXs\n   • Low fees\n   • Fast execution\n   • Referral fees support ChainLINK development'
        },
        {
          title: 'Vault Settings',
          content: 'Configure your rewards:\n• Navigate to $cLINK Vault → Settings\n• Options:\n  - Minimum claim threshold\n  - Auto-stake rewards (toggle)\n  - Default staking period\n  - Wallet for rewards\n  - Email notifications for rewards\n• Super Admin can adjust:\n  - Reward percentage (default 0.5%)\n  - Staking APY rates\n  - Jupiter referral settings\n  - Token mint address'
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
          content: 'Link wallet to unlock features:\n\n1. Navigate to Motherboard page\n2. Click "Connect Wallet" button\n3. Choose wallet:\n   • Phantom (recommended)\n   • Solflare\n   • Jupiter\n   • Other Solana wallets\n4. Approve connection\n5. Sign message to verify ownership\n6. System scans wallet for NFTs\n7. Eligible chips auto-unlock\n\nMultiple Wallets:\n• Can connect multiple wallets\n• NFTs from any connected wallet count\n• Switch between wallets\n• Disconnect anytime\n\nSecurity:\n• Read-only access\n• Cannot spend your tokens\n• Only checks NFT ownership\n• No private key access'
        },
        {
          title: 'Available Chips',
          content: 'Premium features available as chips:\n\nAI Assistant:\n• AI-powered business insights\n• Menu and pricing suggestions\n• Customer behavior analysis\n• Requires: AI Assistant Chip\n\nWebsite Generator:\n• Auto-generate a business website\n• Online menu integration\n• SEO-optimized\n• Requires: Website Generator Chip\n\nPremium Analytics:\n• Customer lifetime value\n• Predictive analytics\n• Custom dashboards\n• Requires: Premium Analytics Chip\n\nMulti-Location:\n• Manage multiple store locations\n• Location-specific inventory\n• Consolidated reporting\n• Requires: Multi-Location Chip\n\nAdvanced Inventory:\n• Automated reordering\n• Supplier management\n• Waste tracking\n• Requires: Advanced Inventory Chip\n\nNote: Browse all available chips at Marketplace from the homepage or System Menu. Available chips are configured by Super Admin.'
        },
        {
          title: 'Purchasing NFTs',
          content: 'How to acquire feature NFTs:\n\n1. Check Required Collection:\n   • View Chip details in Motherboard\n   • Note collection address\n   • See floor price estimate\n\n2. Buy NFT:\n   • Visit Solana NFT marketplace:\n     - Magic Eden (magiceden.io)\n     - Tensor (tensor.trade)\n     - OpenSea (Solana)\n   • Search for collection address\n   • Purchase NFT\n   • NFT arrives in your wallet\n\n3. Verify Ownership:\n   • Return to ChainLINK Motherboard\n   • Connect wallet (if not already)\n   • Click "Refresh" or reconnect wallet\n   • System verifies NFT\n   • Feature unlocks\n\n4. Maintaining Access:\n   • Keep NFT in wallet for continued access\n   • Selling NFT removes feature access\n   • Transfer to another wallet if needed\n   • NFT can be listed on marketplace while in use'
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
          content: 'Purchase POS hardware:\n• Browse recommended hardware\n• Card readers, printers, scanners, tablets\n• Pre-configured for ChainLINK\n• Fast shipping\n• Warranty and support included\n• Competitive pricing\n\nAccess: Navigate to "Device Shop" from System Menu\n\nBenefits:\n• Guaranteed compatibility\n• Plug-and-play setup\n• Bulk discounts available\n• Dealer pricing for resellers'
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
          content: 'Hardware issues:\n\n30-Day Return Policy:\n• Unused items in original packaging\n• Return shipping provided\n• Full refund issued\n\nWarranty:\n• 1-year manufacturer warranty on all hardware\n• Defects and malfunctions covered\n• Replacement or repair\n\nTechnical Support:\n• Contact Device Shop support\n• Phone, email, live chat\n• Setup assistance\n• Troubleshooting help\n• Replacement parts\n\nHow to Get Support:\n1. Navigate to Support page\n2. Select "Hardware Issue"\n3. Describe problem\n4. Attach photos if needed\n5. Submit ticket\n6. Support team responds within 24 hours'
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
          content: 'How to use subdomain:\n\n1. Share with customers:\n   • yourstore.chainlink-pos.sol\n   • Links to your online menu\n   • Or custom landing page\n\n2. Add to Marketing:\n   • Print on business cards\n   • Social media bio\n   • Email signatures\n   • Storefront signage\n\n3. Wallet Integration:\n   • Link subdomain to Solana wallet\n   • Customers can send crypto to subdomain\n   • Resolves to your wallet address\n   • Easier than long wallet addresses\n\n4. Future Features:\n   • NFT integration\n   • Token-gated content\n   • Web3 rewards\n   • Decentralized identity'
        },
        {
          title: 'Subdomain Status',
          content: 'Status meanings:\n\nPending:\n• Request submitted\n• Awaiting Super Admin approval\n• No action needed from merchant\n\nActive:\n• Subdomain approved and live\n• Can be used publicly\n• Linked to your merchant account\n• Shown in Super Admin dashboard\n\nDisabled:\n• Subdomain deactivated\n• Usually for policy violations\n• Contact support to reinstate\n\nView status:\n• Settings → Subdomain\n• Or merchant details in Super Admin panel'
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
          content: 'Ambassador = openTILL\'s reseller/white-label partner program:\n• Ambassadors resell openTILL to merchants under their own brand\n• Earn commissions on merchant revenue\n• Custom branding (logo, colors, domain)\n• Manage your own merchant base\n• Dedicated Ambassador Dashboard\n• Stripe Connect payouts\n\nIdeal for:\n• Payment processors\n• POS resellers\n• Business consultants\n• Technology partners\n• Marketing agencies\n\nAccess: Register at the Ambassador Portal on the homepage. Invite-only after approval.'
        },
        {
          title: 'Dealer Registration',
          content: 'Become a dealer:\n1. Visit dealer landing page\n2. Fill registration form:\n   • Company name\n   • Contact info\n   • Business details\n   • Estimated merchant count\n3. Submit application\n4. Super Admin reviews\n5. Approval + setup:\n   • Dealer account created\n   • Commission rates set\n   • Stripe Connect account created\n6. Access dealer dashboard\n7. Start onboarding merchants'
        },
        {
          title: 'Dealer Dashboard Features',
          content: 'Manage your business:\n• Overview:\n  - Total merchants\n  - Active merchants\n  - Monthly revenue\n  - Earned commissions\n• Merchant Management:\n  - View all your merchants\n  - See merchant status\n  - Impersonate for support\n  - Commission per merchant\n• Commission Tracking:\n  - Real-time commission calculations\n  - Breakdown by merchant\n  - Payment history\n  - Pending payouts\n• Stripe Connect:\n  - Connect your Stripe account\n  - Automatic payouts\n  - View payout history\n• Branding:\n  - Upload your logo\n  - Set brand colors\n  - Custom subdomain\n  - Hide ChainLINK branding (optional)\n• Custom Domains:\n  - Use your own domain\n  - SSL certificates\n  - DNS management\n• Analytics:\n  - Merchant performance\n  - Revenue trends\n  - Growth metrics'
        },
        {
          title: 'Commission Structure',
          content: 'How you earn:\n\nCommission on:\n• Monthly subscription fees\n• Payment processing fees (if applicable)\n• Hardware sales (device shop)\n• Premium features (Motherboard)\n\nRates (set by Super Admin):\n• Typical: 10-30% of revenue\n• Tiered based on volume\n• Performance bonuses available\n\nPayout Schedule:\n• Monthly automatic payouts\n• Via Stripe Connect\n• Minimum payout threshold (e.g., $100)\n• Detailed statements provided\n\nView Commissions:\n• Dealer Dashboard → Commissions\n• Real-time tracking\n• Breakdown by merchant\n• Export reports'
        },
        {
          title: 'Onboarding Merchants',
          content: 'Add merchants to your portfolio:\n\n1. Share your dealer landing page:\n   • yourdomain.chainlink-pos.com\n   • Branded registration form\n\n2. Merchant registers:\n   • Fills onboarding form\n   • Automatically assigned to you\n   • No manual assignment needed\n\n3. Super Admin approves:\n   • Account activated\n   • Trial period starts\n\n4. Provide Support:\n   • Help merchant with setup\n   • Configure settings\n   • Train on features\n   • Ongoing support\n\n5. Earn Commissions:\n   • Automatic from day one\n   • Track in dealer dashboard'
        },
        {
          title: 'White Label Branding',
          content: 'Custom branding:\n\n1. Upload Your Logo:\n   • Dealer Dashboard → Branding\n   • Upload logo (PNG, SVG)\n   • Shows throughout merchant experience\n\n2. Set Brand Colors:\n   • Primary color\n   • Secondary color\n   • Applied to all UI elements\n\n3. Custom Domain:\n   • Use your own domain\n   • Example: pos.yourcompany.com\n   • Full SSL support\n\n4. Hide ChainLINK Branding:\n   • Toggle in dealer settings\n   • Removes "Powered by ChainLINK"\n   • Your brand only\n\n5. Custom Email Templates:\n   • Merchant welcome emails\n   • Receipt templates\n   • Notification emails\n   • All from your brand\n\nMerchants see your brand, not ChainLINK.'
        },
        {
          title: 'Dealer Support',
          content: 'Resources for dealers:\n• Dedicated support channel\n• Priority response times\n• Technical documentation\n• Sales materials:\n  - Brochures\n  - Presentations\n  - Pricing sheets\n  - Demo videos\n• Training sessions\n• Onboarding assistance\n• Marketing support\n• Co-marketing opportunities\n\nContact:\n• Dealer support email\n• Direct support line\n• Slack channel (optional)\n• Regular dealer calls'
        }
      ]
    },
    {
      id: 'super-admin',
      icon: Shield,
      title: 'Super Admin Panel',
      color: 'text-red-600',
      content: [
        {
          title: 'Super Admin Overview',
          content: 'Platform administration:\n• Platform-wide management\n• All merchant access\n• System configuration\n• User management\n• Financial oversight\n• Feature toggles\n\nAccess: Only for openTILL/Isolex team\n• Navigate to "Super Admin" from System Menu\n• Requires admin role\n\nNOTE: This section is for internal use. Merchants do not have access to Super Admin features.'
        },
        {
          title: 'Pending Merchants',
          content: 'Approve new signups:\n1. Navigate to Super Admin → Pending\n2. View inactive merchant applications\n3. Review details:\n   • Business info\n   • Owner contact\n   • Requested plan\n4. Generate credentials:\n   • Auto-generated PIN\n   • Temporary password\n5. Activate merchant:\n   • Set trial period (e.g., 30 days)\n   • Optionally set up demo data\n   • Create admin user\n   • Send activation email with credentials\n6. Or reject:\n   • Enter rejection reason\n   • Send rejection email\n   • Archive application'
        },
        {
          title: 'Merchant Management',
          content: 'Manage all merchants:\n• View all merchants\n• Search and filter\n• Change merchant status:\n  - Active: Full access\n  - Trial: Time-limited access\n  - Suspended: Temporarily disabled\n  - Cancelled: No access\n• Impersonate merchants:\n  - Click "Impersonate"\n  - Login as merchant for support\n  - Exit impersonation anytime\n• View merchant details:\n  - Business info\n  - Subscription plan\n  - Order/revenue stats\n  - Last activity\n• Manage subdomains:\n  - Approve subdomain requests\n  - Regenerate subdomains\n  - Disable if needed\n• Delete merchants (permanent)'
        },
        {
          title: 'Dealer Management',
          content: 'Manage reseller partners:\n• View all dealers\n• Approve dealer applications\n• Set commission rates\n• View dealer merchants\n• Track dealer revenue\n• Manage dealer payouts:\n  - Preview upcoming payouts\n  - Process payouts manually\n  - View payout history\n  - Cancel payouts if needed\n• Dealer branding settings\n• Stripe Connect status'
        },
        {
          title: 'Subscription Management',
          content: 'Subscription oversight:\n• View all active subscriptions\n• Filter by plan (free, basic, pro, enterprise)\n• Filter by status (active, past_due, cancelled)\n• Subscription details:\n  - Current plan\n  - Billing cycle\n  - Next billing date\n  - Payment history\n• Manual actions:\n  - Change plan\n  - Cancel subscription\n  - Add trial days\n  - Adjust pricing\n• Failed payment management\n• Grace period configuration'
        },
        {
          title: 'Subscription Plans Editor',
          content: 'Configure plan options:\n• Create/edit plans:\n  - Plan name and ID\n  - Description\n  - Monthly price\n  - Yearly price (with discount)\n  - Features list\n  - Limits (terminals, users, locations)\n  - Stripe Price IDs\n  - Active/inactive toggle\n  - Featured badge\n  - Display order\n• Plans appear on pricing page\n• Merchants can upgrade/downgrade'
        },
        {
          title: 'Device Shop Management',
          content: 'Manage hardware store:\n• Add/edit products:\n  - Name, SKU, category\n  - Description\n  - Price (retail and cost)\n  - Stock quantity\n  - Images\n  - Specifications\n  - Compatibility\n  - Warranty info\n• View all orders:\n  - Order details\n  - Shipping status\n  - Update tracking numbers\n  - Mark as shipped/delivered\n• Inventory management:\n  - Restock products\n  - Low stock alerts\n  - Reorder levels\n• Featured products\n• Bulk product updates'
        },
        {
          title: 'Chip Manager (Motherboard)',
          content: 'Configure NFT-gated features:\n• Create/edit chips:\n  - Feature name\n  - Description\n  - Required NFT collection address\n  - Number of NFTs required\n  - Category (core, premium, enterprise)\n  - Icon\n  - Display order\n  - Active/inactive\n  - Color coding\n• Chips appear in Motherboard\n• System verifies NFT ownership\n• Enable/disable chips globally'
        },
        {
          title: '$cLINK Vault Manager',
          content: 'Configure crypto rewards:\n• Global vault settings:\n  - Reward percentage (e.g., 0.5%)\n  - Minimum claim threshold\n  - Staking APY rates\n  - Default lockup period\n  - $cLINK token mint address\n  - Jupiter referral code\n  - Auto-calculate rewards toggle\n• View all merchant rewards:\n  - Pending rewards\n  - Claimed rewards\n  - Staking positions\n• Manual reward adjustments\n• Reward distribution schedule'
        },
        {
          title: 'System Logs',
          content: 'Audit trail:\n• View all system activity:\n  - Super admin actions\n  - Merchant actions\n  - Payment events\n  - Integration events\n  - Device connections\n  - Errors and warnings\n  - Security events\n• Filter by:\n  - Log type\n  - Severity\n  - Date range\n  - Merchant\n  - User\n• Search logs\n• Export for analysis\n• Retention period: 90 days\n• Used for:\n  - Security monitoring\n  - Troubleshooting\n  - Compliance\n  - Performance analysis'
        },
        {
          title: 'Global Reports',
          content: 'Platform analytics:\n• Revenue Dashboard:\n  - Total platform revenue\n  - Revenue by merchant\n  - Growth trends\n  - Churn rate\n• Merchant Analytics:\n  - Total merchants\n  - Active/inactive breakdown\n  - Trial conversions\n  - Merchant lifetime value\n• Transaction Metrics:\n  - Total orders processed\n  - Payment method breakdown\n  - Average order value\n  - Refund rates\n• Feature Usage:\n  - Most used features\n  - Adoption rates\n  - Engagement metrics\n• Export all reports'
        },
        {
          title: 'Advertisement Manager',
          content: 'Manage system menu ads:\n• Create/edit advertisements:\n  - Title and description\n  - Image or video\n  - Call-to-action button\n  - Target URL\n  - Start/end dates\n  - Target audience (all, specific role)\n• Ad positioning:\n  - System menu tile\n  - Dashboard banner\n  - POS notification\n• Analytics:\n  - Impressions\n  - Clicks\n  - Conversion rate\n• A/B testing support\n• Schedule campaigns'
        },
        {
          title: 'Notification Manager',
          content: 'Send platform notifications:\n• Create notifications:\n  - Title and message\n  - Type (info, warning, success, error)\n  - Priority (low, medium, high, urgent)\n  - Target:\n    * All merchants\n    * Specific merchants\n    * By plan\n    * By status\n  - Action button (optional)\n  - Expiration date\n• Delivery channels:\n  - In-app banner\n  - Email\n  - SMS (if enabled)\n• Notification history\n• Read/unread status\n• Scheduled notifications'
        },
        {
          title: 'Landing Page Editor',
          content: 'Customize homepage:\n• Edit landing page content:\n  - Hero section:\n    * Headline\n    * Subheadline\n    * CTA buttons\n    * Background image/video\n  - Features section:\n    * Add/edit features\n    * Icons and descriptions\n  - Statistics:\n    * Total merchants\n    * Orders processed\n    * Total revenue\n  - Testimonials\n  - Footer links\n• Preview changes\n• Publish updates\n• Revert to previous version'
        },
        {
          title: 'Settings & Tools',
          content: 'System configuration:\n• PIN Reset Tool:\n  - Search user by email\n  - Generate new 4-digit PIN\n  - Notify user\n• Password Reset Tool:\n  - Search user by email\n  - Force password reset\n  - Send reset link\n• Platform Settings:\n  - Default tax rates\n  - Default currency\n  - Trial period duration\n  - Payment gateways\n  - Email templates\n  - Maintenance mode\n• Integration Settings:\n  - API keys\n  - Webhook URLs\n  - Third-party services\n• Feature Flags:\n  - Enable/disable features globally\n  - Beta feature testing'
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
          content: 'System running slow:\n\n1. Browser Issues:\n   • Close unused tabs\n   • Clear cache and cookies\n   • Update browser to latest version\n   • Try different browser\n   • Disable browser extensions\n\n2. Internet Connection:\n   • Test speed (speedtest.net)\n   • Restart router/modem\n   • Switch to ethernet if on WiFi\n   • Contact ISP\n\n3. Device Performance:\n   • Restart tablet/computer\n   • Close background apps\n   • Free up storage space\n   • Update operating system\n\n4. Server Issues:\n   • Check status.chainlinkpos.com\n   • Platform maintenance\n   • Wait and retry\n\nIf persistent, contact support with details.'
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
          content: 'Payment processing failures:\n\n1. Gateway Connection Failed:\n   • Verify API keys correct\n   • Check test/live mode matches keys\n   • Test connection in settings\n   • Check gateway dashboard for issues\n   • Verify account in good standing\n\n2. Transaction Declined:\n   • Not a ChainLINK issue\n   • Customer card declined by bank\n   • Try different card\n   • Check card not expired\n   • Verify sufficient funds\n\n3. Gateway Timeout:\n   • Internet connection issue\n   • Try again\n   • If persists, switch to backup gateway\n   • Contact gateway support\n\n4. Invalid Merchant Account:\n   • Gateway account suspended\n   • Verification needed\n   • Contact gateway directly\n\n5. API Error:\n   • Check gateway status page\n   • May be down for maintenance\n   • Try different gateway\n   • Contact ChainLINK support'
        },
        {
          title: 'Wallet Connection Issues',
          content: 'Solana wallet not connecting:\n\n1. Wallet Not Detected:\n   • Install wallet extension (Phantom, Solflare)\n   • Refresh page after install\n   • Try different browser\n   • Check wallet is unlocked\n\n2. Connection Rejected:\n   • Wallet popup blocked?\n   • Allow popups in browser\n   • Try again\n   • Approve connection in wallet\n\n3. Wrong Network:\n   • Switch to Mainnet (or Devnet for testing)\n   • In wallet settings\n   • Reconnect\n\n4. NFT Not Recognized:\n   • Verify NFT in wallet\n   • Check correct wallet connected\n   • Refresh/reconnect wallet\n   • Clear cache\n\n5. Transaction Failed:\n   • Insufficient SOL for gas\n   • Add SOL to wallet\n   • Try again\n   • Increase slippage if swapping'
        },
        {
          title: 'Getting Help',
          content: 'Support channels:\n\n1. Live Chat:\n   • Click chat bubble (bottom right)\n   • Instant help during business hours\n   • After hours: Leave message\n\n2. Support Tickets:\n   • Navigate to Support page\n   • Click "Submit Ticket"\n   • Describe issue in detail\n   • Attach screenshots\n   • Response within 24 hours\n\n3. Phone/Text:\n   • Call or text: 419-729-3889\n   • Business hours: Mon-Fri 9am-5pm EST\n   • Leave voicemail after hours\n\n4. Email:\n   • support@isolex.io\n   • Include:\n     - Merchant name\n     - Issue description\n     - Steps to reproduce\n     - Screenshots/videos\n   - Response within 24 hours\n\n5. User Manual:\n   • This guide\n   • Search for topics\n   • Step-by-step tutorials\n\n6. Video Tutorials:\n   • Coming soon\n   • YouTube channel\n\n7. Community Forum:\n   • Future feature\n   • Connect with other merchants'
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
          content: 'Super Admin: Platform team members (ChainLINK staff) with access to all merchants, system configuration, and platform-wide settings. Used for support and management.\n\nMerchant Admin: Business owner/manager with full access to their own merchant account only. Can manage products, employees, settings, but cannot access other merchants or platform settings.'
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
          title: 'How secure is ChainLINK POS?',
          content: 'ChainLINK uses:\n• Bank-level encryption (TLS/SSL)\n• PCI-DSS compliant payment processing\n• Secure blockchain transactions\n• Regular security audits\n• Data backup and redundancy\n• Role-based access control\n• Audit logging\n• Optional 2FA\n• SOC 2 Type II certified (in progress)'
        },
        {
          title: 'What devices are compatible?',
          content: 'ChainLINK works on any device with a modern web browser:\n• Desktop: Windows, Mac, Linux, Chrome OS\n• Tablets: iPad, Android tablets (recommended: 10"+)\n• Smartphones: iOS, Android (for managers/mobile POS)\n• All-in-one POS terminals\n• Touch screen displays\n• Minimum: Dual-core processor, 4GB RAM, internet connection'
        },
        {
          title: 'How does $cLINK Vault work?',
          content: 'Earn cryptocurrency rewards for processing credit card payments. Earn 0.5% of your monthly CC volume in $cLINK tokens. Connect Solana wallet, claim rewards, stake for APY, or swap via Jupiter. Rewards calculated automatically at month-end. Minimum claim threshold applies. Access via "$cLINK Vault" in System Menu.'
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
          title: 'Can I white label openTILL?',
          content: 'Ambassadors can fully customize branding: Upload logo, set brand colors, use custom domain, optionally hide openTILL branding. Requires an approved Ambassador account. Merchants see your brand throughout the platform. Custom email templates available. Contact Super Admin or register at the Ambassador Portal on the homepage.'
        },
        {
          title: 'How do I become an Ambassador/reseller?',
          content: 'Visit the Ambassador Portal on the homepage → Fill registration form → Submit application → Super Admin reviews and approves → Ambassador account created → Commission rates set → Connect Stripe for payouts → Access Ambassador Dashboard → Start onboarding merchants → Earn commissions on merchant revenue. Ideal for payment processors, POS resellers, and business consultants.'
        },
        {
          title: 'What payment gateways are supported?',
          content: 'Supported gateways:\n• Stripe (recommended - easy setup)\n• Square (all-in-one with hardware)\n• PayPal (online payments)\n• Authorize.net (enterprise)\n• More coming soon\n\nConfigure in Settings → Payment Gateways. Can enable multiple and set default. Each requires API credentials from their respective dashboards.'
        },
        {
          title: 'How do I handle age-restricted items?',
          content: 'Mark products as "Age Restricted" in product settings. Set minimum age (18 or 21). When added to cart, system prompts for verification. Options: Scan ID, Manual Entry, Visual Check. Record ID last 4 digits. Cannot proceed without verification. Verification data stored in order history for compliance audits.'
        },
        {
          title: 'Can customers pay with EBT/SNAP?',
          content: 'Yes! Mark eligible food products as "EBT Eligible" in product settings. System auto-calculates eligible vs non-eligible amounts. At checkout, select EBT payment. Only eligible items charged to EBT card. Separate payment for non-eligible items (alcohol, prepared foods, etc.). Record approval codes. Compliance reporting available.'
        }
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    content: section.content.filter(item =>
      searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.content.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">openTILL POS User Manual</h1>
        <p className="text-blue-100">Complete guide to using your point of sale system</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search user manual..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-6 text-lg"
        />
      </div>

      {/* Manual Content */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="flex flex-col md:flex-row gap-6">
        {/* Vertical Tab List */}
        <div className="md:w-64 flex-shrink-0">
          <ScrollArea className="h-auto md:h-[calc(100vh-300px)]">
            <TabsList className="flex flex-col h-auto space-y-1 bg-transparent">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20"
                  >
                    <Icon className={`w-5 h-5 ${section.color}`} />
                    <span className="text-left">{section.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsContent key={section.id} value={section.id} className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${section.color.replace('text-', '')}-400 to-${section.color.replace('text-', '')}-600 flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {section.content.length === 0 && searchTerm !== '' ? (
                      <p className="text-gray-500 text-center py-8">
                        No results found for "{searchTerm}"
                      </p>
                    ) : (
                      section.content.map((item, index) => (
                        <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            {item.title}
                          </h3>
                          <div className="space-y-4">
                            <div className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                              {item.content}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>

      {/* Help Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <HelpCircle className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Still need help?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Our support team is available 24/7 to assist you with any questions or issues.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-600 text-white">Live Chat Available</Badge>
                <Badge variant="outline">📞 419-729-3889</Badge>
                <Badge variant="outline">✉️ support@isolex.io</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}