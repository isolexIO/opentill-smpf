import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import CustomerSelector from "./CustomerSelector";
import LocationSwitcher from "@/components/locations/LocationSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CreditCard,
  Monitor,
  Globe,
  MonitorPlay,
  Package,
  Camera,
  Lock,
  MoreVertical,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useLanguage } from "@/lib/i18n/useLanguage";

export default function POSToolbar({
  stationName,
  cartCount,
  isDemo,
  activeStaff,
  isMultiLocation,
  locations,
  activeLocationId,
  onSwitchLocation,
  viewMode,
  setViewMode,
  isKitchenDisplayEnabled,
  openTicketsCount,
  onLoadOpenTickets,
  pendingOnlineOrdersCount,
  onLoadPendingOnlineOrders,
  onOpenCustomerDisplay,
  onOpenKitchenDisplay,
  posProductView,
  onBackToDepartments,
  customers,
  selectedCustomer,
  onSelectCustomer,
  posMode,
  tableNumber,
  onTableNumberChange,
  onOpenItemDialog,
  isCameraScannerEnabled,
  onOpenCameraScanner,
  onSendToKitchen,
  onLock,
  onClockOut,
}) {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:p-4 sticky top-0 z-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{t('pos.title')}</h1>
          <Badge variant="outline" className="text-xs">
            {stationName}
          </Badge>
          {isMultiLocation && (
            <LocationSwitcher
              locations={locations}
              activeLocationId={activeLocationId}
              onSwitch={onSwitchLocation}
            />
          )}
          <Badge variant="outline" className="px-2 py-1 text-sm">
            {cartCount}
          </Badge>
          {!isDemo && activeStaff && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <User className="w-3 h-3" /> {activeStaff.full_name}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={viewMode === 'pos' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('pos')}
            className="flex-1 sm:flex-none"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            POS
          </Button>

          {isKitchenDisplayEnabled && (
            <Button
              variant={viewMode === 'open_tickets' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode('open_tickets');
                onLoadOpenTickets();
              }}
              className="flex-1 sm:flex-none relative"
            >
              <Monitor className="w-4 h-4 mr-2" />
              {t('pos.tickets')}
              {openTicketsCount > 0 && (
                <Badge className="ml-2 bg-red-500">{openTicketsCount}</Badge>
              )}
            </Button>
          )}

          <Button
            variant={viewMode === 'online_orders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setViewMode('online_orders');
              onLoadPendingOnlineOrders();
            }}
            className="flex-1 sm:flex-none relative"
          >
            <Globe className="w-4 h-4 mr-2" />
            {t('pos.online')}
            {pendingOnlineOrdersCount > 0 && (
              <Badge className="ml-2 bg-orange-500">{pendingOnlineOrdersCount}</Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCustomerDisplay}
            title={t('pos.cd')}
            className="flex-1 sm:flex-none"
          >
            <MonitorPlay className="w-4 h-4 mr-2" />
            {t('pos.cd')}
          </Button>

          {isKitchenDisplayEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenKitchenDisplay}
              title={t('pos.kd')}
              className="flex-1 sm:flex-none"
            >
              <Monitor className="w-4 h-4 mr-2" />
              {t('pos.kd')}
            </Button>
          )}

          {viewMode === 'pos' && (
            <>
              {posProductView === 'products' && (
                <Button variant="outline" size="sm" onClick={onBackToDepartments}>
                  ← {t('pos.departments')}
                </Button>
              )}

              <CustomerSelector
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={onSelectCustomer}
              />

              {posMode === "restaurant" && (
                <Input
                  placeholder={t('pos.tableNumber')}
                  value={tableNumber}
                  onChange={(e) => onTableNumberChange(e.target.value)}
                  className="w-24"
                />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenItemDialog}
                title={t('pos.openItem')}
              >
                <Package className="w-4 h-4 mr-2" />
                {t('pos.openItem')}
              </Button>

              {isCameraScannerEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenCameraScanner}
                  title={t('pos.scan')}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {t('pos.scan')}
                </Button>
              )}

              {posMode === "restaurant" && cartCount > 0 && isKitchenDisplayEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSendToKitchen}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {t('pos.sendToKitchen')}
                </Button>
              )}
            </>
          )}

          {!isDemo && activeStaff && (
            <Button variant="outline" size="sm" onClick={onLock}>
              <Lock className="w-4 h-4 mr-2" />
              {t('pos.lock')}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('pos.system')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = createPageUrl('SystemMenu')}>
                <Menu className="w-4 h-4 mr-2" />
                {t('pos.systemMenu')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = createPageUrl('Settings')}>
                <Settings className="w-4 h-4 mr-2" />
                {t('pos.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClockOut}>
                <Lock className="w-4 h-4 mr-2" />
                {t('pos.lockTerminal')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}