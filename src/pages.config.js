import AIWebsiteGenerator from './pages/AIWebsiteGenerator';
import About from './pages/About';
import Contact from './pages/Contact';
import CustomerDisplay from './pages/CustomerDisplay';
import Customers from './pages/Customers';
import DealerDashboard from './pages/DealerDashboard';
import DealerLanding from './pages/DealerLanding';
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
import OnlineMenu from './pages/OnlineMenu';
import OnlineOrders from './pages/OnlineOrders';
import Orders from './pages/Orders';
import POS from './pages/POS';
import PinLogin from './pages/PinLogin';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Products from './pages/Products';
import Reports from './pages/Reports';
import RootAdmin from './pages/RootAdmin';
import Settings from './pages/Settings';
import Subscriptions from './pages/Subscriptions';
import SuperAdmin from './pages/SuperAdmin';
import Support from './pages/Support';
import SystemMenu from './pages/SystemMenu';
import TermsOfService from './pages/TermsOfService';
import Users from './pages/Users';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIWebsiteGenerator": AIWebsiteGenerator,
    "About": About,
    "Contact": Contact,
    "CustomerDisplay": CustomerDisplay,
    "Customers": Customers,
    "DealerDashboard": DealerDashboard,
    "DealerLanding": DealerLanding,
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
    "OnlineMenu": OnlineMenu,
    "OnlineOrders": OnlineOrders,
    "Orders": Orders,
    "POS": POS,
    "PinLogin": PinLogin,
    "PrivacyPolicy": PrivacyPolicy,
    "Products": Products,
    "Reports": Reports,
    "RootAdmin": RootAdmin,
    "Settings": Settings,
    "Subscriptions": Subscriptions,
    "SuperAdmin": SuperAdmin,
    "Support": Support,
    "SystemMenu": SystemMenu,
    "TermsOfService": TermsOfService,
    "Users": Users,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};