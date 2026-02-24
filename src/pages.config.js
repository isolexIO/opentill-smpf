/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIAssistant from './pages/AIAssistant';
import AIWebsiteGenerator from './pages/AIWebsiteGenerator';
import About from './pages/About';
import BuilderDashboard from './pages/BuilderDashboard';
import BuilderOnboarding from './pages/BuilderOnboarding';
import Builders from './pages/Builders';
import ChipDetail from './pages/ChipDetail';
import Contact from './pages/Contact';
import CustomerDisplay from './pages/CustomerDisplay';
import Customers from './pages/Customers';
import DUCVault from './pages/DUCVault';
import DealerAdmin from './pages/DealerAdmin';
import DealerDashboard from './pages/DealerDashboard';
import DealerHome from './pages/DealerHome';
import DealerLanding from './pages/DealerLanding';
import DealerLogin from './pages/DealerLogin';
import DealerOnboarding from './pages/DealerOnboarding';
import Departments from './pages/Departments';
import DeviceMonitor from './pages/DeviceMonitor';
import DeviceShop from './pages/DeviceShop';
import Devices from './pages/Devices';
import EmailLogin from './pages/EmailLogin';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import KitchenDisplay from './pages/KitchenDisplay';
import LoyaltyProgram from './pages/LoyaltyProgram';
import Marketplace from './pages/Marketplace';
import MerchantOnboarding from './pages/MerchantOnboarding';
import Motherboard from './pages/Motherboard';
import OnlineMenu from './pages/OnlineMenu';
import OnlineOrders from './pages/OnlineOrders';
import Orders from './pages/Orders';
import POS from './pages/POS';
import PinLogin from './pages/PinLogin';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Products from './pages/Products';
import ReferralDashboard from './pages/ReferralDashboard';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SubmitChip from './pages/SubmitChip';
import Subscriptions from './pages/Subscriptions';
import SuperAdmin from './pages/SuperAdmin';
import Support from './pages/Support';
import SystemMenu from './pages/SystemMenu';
import TermsOfService from './pages/TermsOfService';
import Users from './pages/Users';
import WalletLoginPage from './pages/WalletLoginPage';
import cLINKVault from './pages/cLINKVault';
import Copyright from './pages/Copyright';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AIWebsiteGenerator": AIWebsiteGenerator,
    "About": About,
    "BuilderDashboard": BuilderDashboard,
    "BuilderOnboarding": BuilderOnboarding,
    "Builders": Builders,
    "ChipDetail": ChipDetail,
    "Contact": Contact,
    "CustomerDisplay": CustomerDisplay,
    "Customers": Customers,
    "DUCVault": DUCVault,
    "DealerAdmin": DealerAdmin,
    "DealerDashboard": DealerDashboard,
    "DealerHome": DealerHome,
    "DealerLanding": DealerLanding,
    "DealerLogin": DealerLogin,
    "DealerOnboarding": DealerOnboarding,
    "Departments": Departments,
    "DeviceMonitor": DeviceMonitor,
    "DeviceShop": DeviceShop,
    "Devices": Devices,
    "EmailLogin": EmailLogin,
    "Home": Home,
    "Inventory": Inventory,
    "KitchenDisplay": KitchenDisplay,
    "LoyaltyProgram": LoyaltyProgram,
    "Marketplace": Marketplace,
    "MerchantOnboarding": MerchantOnboarding,
    "Motherboard": Motherboard,
    "OnlineMenu": OnlineMenu,
    "OnlineOrders": OnlineOrders,
    "Orders": Orders,
    "POS": POS,
    "PinLogin": PinLogin,
    "PrivacyPolicy": PrivacyPolicy,
    "Products": Products,
    "ReferralDashboard": ReferralDashboard,
    "Reports": Reports,
    "Settings": Settings,
    "SubmitChip": SubmitChip,
    "Subscriptions": Subscriptions,
    "SuperAdmin": SuperAdmin,
    "Support": Support,
    "SystemMenu": SystemMenu,
    "TermsOfService": TermsOfService,
    "Users": Users,
    "WalletLoginPage": WalletLoginPage,
    "cLINKVault": cLINKVault,
    "Copyright": Copyright,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};