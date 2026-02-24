import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Store,
  Package,
  HelpCircle,
  Wifi,
  ShoppingCart,
  Wallet,
  Users,
  Settings,
  Cpu,
  Shield,
  DollarSign
} from 'lucide-react';

export default function UserGuide() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">openTILL POS User Guide</h2>
          <p className="text-gray-500">Everything you need to know about using openTILL POS</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            Need immediate help?{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600"
              onClick={() => window.open('https://071be2.c.myucm.cloud/liveChat?liveChatAccess=MF83MDA2N2YzNDg5OTQ0OWI0OTdiMzhlMWQyNDhkNTg5Ml8wMDBiODIwNzFiZTImNmI3ODBlYzM4ZThmMWQyYjNiNDcwMTliMWM1OWM2MzA=', '_blank')}
            >
              Chat with support
            </Button>
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="pos">POS System</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="support">Support & FAQ</TabsTrigger>
        </TabsList>

        {/* Getting Started */}
        <TabsContent value="getting-started">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Getting Started with openTILL
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none space-y-4">
              <h3 className="text-lg font-semibold">Welcome to openTILL POS</h3>
              <p>
                openTILL is a modern, blockchain-enabled point of sale system designed for restaurants, retail stores, and service businesses.
                The core POS system is <strong>completely free</strong> — you only pay for premium features you choose to add.
              </p>
              <p>Key features included in the free core system:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Full POS with cash, card, EBT, Solana Pay, and split payments</li>
                <li>Inventory management with low-stock alerts</li>
                <li>Customer management and loyalty points</li>
                <li>Sales reports and analytics</li>
                <li>Staff management with PIN login and permissions</li>
                <li>Kitchen display and customer-facing screen</li>
                <li>Online ordering with delivery or pickup</li>
                <li>Dual pricing (surcharge / cash discount)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6">First Time Setup — Step by Step</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Complete merchant onboarding at <strong>opentill-pos.com</strong></li>
                <li>Once approved, log in with your email and password</li>
                <li>Go to <strong>Settings → General</strong> to set your business name, timezone, and tax rate</li>
                <li>Add products via <strong>System Menu → Products → Add Product</strong></li>
                <li>Configure payment methods in <strong>Settings → Payment Gateways</strong></li>
                <li>Add your staff in <strong>Settings → Staff Management</strong> and assign PINs</li>
                <li>Run a test order from <strong>System Menu → POS</strong></li>
              </ol>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <strong>💡 Tip:</strong> Staff members use a 4-digit PIN to clock in — no passwords needed at the register!
              </div>

              <h3 className="text-lg font-semibold mt-6">Understanding User Roles</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Super Admin:</strong> Isolex/openTILL team — full platform access</li>
                <li><strong>Merchant Admin:</strong> Business owner with full control over their account</li>
                <li><strong>Manager:</strong> Can process orders, manage inventory, view reports, manage staff</li>
                <li><strong>Cashier:</strong> Can process orders and accept payments only</li>
                <li><strong>Kitchen:</strong> View-only access to kitchen display orders</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6">POS Modes</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Restaurant:</strong> Table numbers, dine-in service, kitchen orders</li>
                <li><strong>Retail:</strong> Product scanning, inventory tracking</li>
                <li><strong>Quick Service:</strong> Fast checkout, order numbers</li>
                <li><strong>Food Truck:</strong> Mobile simplified menu</li>
              </ul>
              <p>Switch modes in <strong>Settings → General</strong>.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POS System */}
        <TabsContent value="pos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Using the POS System
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none space-y-4">
              <h3 className="text-lg font-semibold">Processing an Order</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>Clock In:</strong> Enter your 4-digit PIN on the PIN Login screen</li>
                <li><strong>Open POS:</strong> From System Menu, tap <strong>POS</strong></li>
                <li><strong>Add Items:</strong> Tap product cards or scan barcodes to add to cart</li>
                <li><strong>Modify Items:</strong> Tap an item in the cart to add modifiers (sizes, toppings, etc.)</li>
                <li><strong>Age Verification:</strong> If an item is restricted, you'll be prompted to verify the customer's age</li>
                <li><strong>Apply Discount:</strong> Tap "Apply Discount" and enter % or $ amount</li>
                <li><strong>Select Customer:</strong> Link a loyalty customer to earn/redeem points (optional)</li>
                <li><strong>Send to Kitchen:</strong> Tap "Send to Kitchen" (restaurant mode)</li>
                <li><strong>Checkout:</strong> Review total, tap <strong>Pay</strong>, choose payment method</li>
                <li><strong>Receipt:</strong> Print, email, or skip receipt</li>
              </ol>

              <h3 className="text-lg font-semibold mt-6">Dual Pricing (Surcharge / Cash Discount)</h3>
              <p>
                openTILL supports legally-compliant dual pricing. When enabled, the POS shows two prices:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Cash Price:</strong> Base price for cash or EBT payments</li>
                <li><strong>Card Price:</strong> Includes the surcharge for credit/debit card payments</li>
              </ul>
              <p>Configure in <strong>Settings → Pricing & Surcharge</strong>. You can set surcharge %, enable flat fees, and choose your region (US/CA).</p>

              <h3 className="text-lg font-semibold mt-6">Open Items</h3>
              <p>Need to ring up something not in your catalog? Tap <strong>Open Item</strong> on the POS, enter a name and price, and add it to the cart on the fly.</p>

              <h3 className="text-lg font-semibold mt-6">Customer Display</h3>
              <p>Open the customer display URL (from <strong>Settings → Customer Display</strong>) on a tablet or secondary screen facing the customer. It auto-updates in real time as items are added, and allows customers to select tips or confirm payment.</p>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <strong>⚠️ Always verify the order total with the customer before completing payment!</strong>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-600" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none space-y-4">
              <h3 className="text-lg font-semibold">Supported Payment Methods</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Cash:</strong> Enter amount tendered and system calculates change automatically</li>
                <li><strong>Card:</strong> Credit/debit via Stripe, Square, or other configured gateway</li>
                <li><strong>EBT/SNAP:</strong> For eligible food items — system auto-calculates eligible vs non-eligible totals</li>
                <li><strong>Solana Pay:</strong> Crypto payments via QR code — USDC or custom SPL token</li>
                <li><strong>Split Payment:</strong> Combine any two methods (e.g., EBT + Card)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6">Setting Up Solana Pay</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Go to <strong>Settings → Solana Pay</strong></li>
                <li>Toggle <strong>Enable Solana Pay</strong></li>
                <li>Select network: <strong>Devnet</strong> (testing) or <strong>Mainnet</strong> (live)</li>
                <li>Enter your Solana wallet address</li>
                <li>Choose accepted token (USDC recommended, or custom SPL token)</li>
                <li>Save — customers can now pay via QR code at checkout</li>
              </ol>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <strong>🚀 Why Solana?</strong> Transactions settle in under 2 seconds with fees under $0.01.
              </div>

              <h3 className="text-lg font-semibold mt-6">Wallet Payments & Web3 Identity</h3>
              <p>In <strong>Settings → Wallet & Payments</strong>, you can connect your Solana wallet (Phantom, Solflare, etc.) to your account. This unlocks:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Wallet-based login authentication</li>
                <li>Access to the Motherboard (chip-based features)</li>
                <li>$cLINK Vault rewards</li>
                <li>Setting a primary wallet for incoming payments</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6">Refunds</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Go to <strong>System Menu → Orders</strong></li>
                <li>Find the order and tap <strong>View Details</strong></li>
                <li>Tap <strong>Refund</strong> → select full or partial</li>
                <li>Enter reason and confirm</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                Managing Products & Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none space-y-4">
              <h3 className="text-lg font-semibold">Adding Products</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Go to <strong>System Menu → Products → Add Product</strong></li>
                <li>Enter Name, Price, and Department (required)</li>
                <li>Optional: SKU, Barcode, Description, Product Image</li>
                <li>Set <strong>EBT Eligible</strong> for SNAP-qualifying food items</li>
                <li>Set <strong>Age Restricted</strong> for alcohol, tobacco, vape (set min age: 18 or 21)</li>
                <li>Set stock quantity and low-stock alert threshold</li>
                <li>Add modifier groups (sizes, toppings, extras with price adjustments)</li>
                <li>Click <strong>Save</strong></li>
              </ol>

              <h3 className="text-lg font-semibold mt-6">Barcode Scanning & Product Lookup</h3>
              <p>Connect a USB or Bluetooth scanner and just scan — openTILL searches your catalog first, then checks external databases (Open Food Facts, UPC Item DB) to auto-fill product details. If nothing is found, you're prompted to create it manually.</p>

              <h3 className="text-lg font-semibold mt-6">Stock Tracking</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Stock decreases automatically with each sale</li>
                <li>Low-stock alerts appear in the dashboard</li>
                <li>Go to <strong>Inventory</strong> to restock, view history, or get reorder suggestions</li>
                <li>Enable <strong>Hide When Empty</strong> to remove out-of-stock items from POS automatically</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6">Departments</h3>
              <p>Organize products with departments. Create departments with custom names, colors, and icons in <strong>System Menu → Departments</strong>. Products are filtered by department tabs on the POS.</p>

              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <strong>💡 Best Practice:</strong> Set low-stock alerts to 1–2 weeks of expected sales so you never run out during busy periods.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-600" />
                Staff Management
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none space-y-4">
              <h3 className="text-lg font-semibold">Adding Staff Members</h3>
              <p>Go to <strong>Settings → Staff Management</strong> to add and manage your team.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Click <strong>+ Add Staff Member</strong></li>
                <li>Enter their full name, email, and a 4-digit PIN</li>
                <li>Assign a role: <strong>Admin, Manager, Cashier, Kitchen, Viewer</strong>, or Custom</li>
                <li>Configure granular permissions (process orders, manage products, view reports, issue refunds, etc.)</li>
                <li>Click <strong>Save</strong> — they can now clock in with their PIN</li>
              </ol>

              <h3 className="text-lg font-semibold mt-6">PIN Login</h3>
              <p>Staff clock in from the <strong>PIN Login</strong> screen by entering their 4-digit PIN. No password required at the register. To clock out, go to <strong>System Menu → Profile → Clock Out</strong>.</p>

              <h3 className="text-lg font-semibold mt-6">Resetting a PIN</h3>
              <p>Go to <strong>Settings → Staff Management</strong>, click the staff member, enter a new 4-digit PIN, and save. Notify the employee of their new PIN.</p>

              <h3 className="text-lg font-semibold mt-6">Time Tracking</h3>
              <p>Every PIN login/logout is recorded. View time entries per employee in <strong>Users → Time Tracking</strong>, edit entries as an admin, and export timesheets for payroll.</p>

              <h3 className="text-lg font-semibold mt-6">Performance Tracking</h3>
              <p>View sales per employee, average ticket size, tips earned, and refunds issued in <strong>Reports → Employee Performance</strong>.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium Features */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-violet-600" />
                Premium Features (Chips, Vault & Referrals)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none space-y-4">
              <h3 className="text-lg font-semibold">The Motherboard — Chip-Based Feature System</h3>
              <p>
                openTILL uses a modular "chip" system to unlock premium features. Each chip represents a specific feature upgrade.
                Some chips are one-time purchases; others are recurring subscriptions — all paid in $DUC tokens.
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Connect your Solana wallet in <strong>Settings → Wallet & Payments</strong></li>
                <li>Go to <strong>System Menu → Motherboard</strong></li>
                <li>Browse available chips (Advanced Analytics, AI Assistant, Website Generator, etc.)</li>
                <li>Purchase with $DUC — the chip installs instantly</li>
                <li>Feature is unlocked as long as your subscription is active (or you hold the NFT)</li>
              </ol>
              <p>Browse all available chips at the <strong>Marketplace</strong> from the home page or System Menu.</p>

              <h3 className="text-lg font-semibold mt-6">$cLINK Vault — Crypto Rewards</h3>
              <p>Earn $cLINK tokens by processing credit card payments. You receive <strong>0.5% of your monthly CC volume</strong> in $cLINK.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Connect your Solana wallet in the Vault</li>
                <li>Rewards are calculated monthly and appear as "Pending"</li>
                <li>Claim rewards to your wallet once you meet the minimum threshold</li>
                <li>Stake $cLINK to earn APY (up to 20% for 365-day lockups)</li>
                <li>Swap $cLINK for USDC or other tokens via Jupiter DEX</li>
              </ul>
              <p>Access via <strong>System Menu → $cLINK Vault</strong>.</p>

              <h3 className="text-lg font-semibold mt-6">Referral Program</h3>
              <p>Earn rewards by referring other merchants to openTILL.</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Go to <strong>System Menu → Referral Dashboard</strong></li>
                <li>Generate or view your unique referral code</li>
                <li>Share your referral link with other business owners</li>
                <li>When they sign up and become active, you earn referral rewards</li>
                <li>Track all your referrals and earnings from the Referral Dashboard</li>
              </ol>

              <h3 className="text-lg font-semibold mt-6">Two-Factor Authentication (2FA)</h3>
              <p>Enable 2FA in <strong>Settings → Two-Factor Auth</strong> for enhanced account security. Uses an authenticator app (Google Authenticator, Authy, etc.).</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support & FAQ */}
        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-yellow-600" />
                Support & Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none space-y-4">
              <h3 className="text-lg font-semibold">Getting Help</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Live Chat:</strong> Click the chat bubble in the bottom-right corner of any page</li>
                <li><strong>Support Tickets:</strong> Go to <strong>System Menu → Support → New Ticket</strong></li>
                <li><strong>Phone/Text:</strong> 419-729-3889 (Mon–Fri, 9am–5pm EST)</li>
                <li><strong>Email:</strong> support@isolex.io (24–48 hour response)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6">Frequently Asked Questions</h3>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold">How do I reset a staff member's PIN?</p>
                  <p className="text-gray-600">Go to <strong>Settings → Staff Management</strong>, click the staff member, enter a new PIN, and save.</p>
                </div>
                <div>
                  <p className="font-semibold">Can I accept both card and crypto payments?</p>
                  <p className="text-gray-600">Yes! Enable card gateways in <strong>Settings → Payment Gateways</strong> and crypto in <strong>Settings → Solana Pay</strong>. Customers choose at checkout.</p>
                </div>
                <div>
                  <p className="font-semibold">How does dual pricing work?</p>
                  <p className="text-gray-600">Enable in <strong>Settings → Pricing & Surcharge</strong>. The POS will show two prices — a cash price and a card price with the surcharge added. The correct price is automatically applied based on payment method.</p>
                </div>
                <div>
                  <p className="font-semibold">What's the Motherboard?</p>
                  <p className="text-gray-600">It's openTILL's modular feature system. Connect a Solana wallet, browse available chips (feature upgrades), and purchase them with $DUC tokens to unlock capabilities like AI Assistant, Advanced Analytics, Website Generator, and more.</p>
                </div>
                <div>
                  <p className="font-semibold">How do I become an Ambassador/Reseller?</p>
                  <p className="text-gray-600">Visit the <strong>Ambassador Portal</strong> from the homepage and fill out the registration form. Once approved, you'll get your own branded portal and earn commissions on merchants you onboard.</p>
                </div>
                <div>
                  <p className="font-semibold">What if my card reader stops working?</p>
                  <p className="text-gray-600">Check power and cables first. Test in <strong>Settings → Devices</strong>. If still broken, submit a support ticket from <strong>System Menu → Support</strong>.</p>
                </div>
                <div>
                  <p className="font-semibold">How do I purchase hardware?</p>
                  <p className="text-gray-600">Go to <strong>System Menu → Device Shop</strong> to browse and order card readers, printers, scanners, and more — all pre-configured for openTILL.</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                <strong>💡 Tip:</strong> Before submitting a ticket, check the full User Manual in the <strong>Resources</strong> tab — your answer is likely already there!
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}