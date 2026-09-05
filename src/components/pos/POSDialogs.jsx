import CameraScanner from "./CameraScanner";
import QuickCreateModal from "./QuickCreateModal";
import PaymentChoiceDialog from "./PaymentChoiceDialog";
import PaymentModal from "./PaymentModal";
import AgeVerificationDialog from "./AgeVerificationDialog";
import OpenItemDialog from "./OpenItemDialog";
import StaffLockScreen from "./StaffLockScreen";

export default function POSDialogs({
  isCameraScannerEnabled,
  isCameraScannerOpen,
  onCloseCameraScanner,
  onScan,
  productNotFoundDialog,
  setProductNotFoundDialog,
  onCreateProduct,
  merchantId,
  departments,
  showPaymentChoice,
  onClosePaymentChoice,
  onCashSelected,
  onEbtSelected,
  onCustomerTerminalSelected,
  order,
  waitingForCustomer,
  customerSelectedMethod,
  showPayment,
  onClosePayment,
  totals,
  onProcessPayment,
  onStartInteractivePayment,
  customer,
  settings,
  cart,
  posMode,
  tableNumber,
  stationId,
  stationName,
  isAgeVerificationOpen,
  onCloseAgeVerification,
  onAgeVerified,
  restrictedItems,
  isOpenItemDialogOpen,
  onCloseOpenItemDialog,
  onAddItem,
  isDemo,
  isLocked,
  onUnlockStaff,
}) {
  const requiredAge = Math.max(...restrictedItems.map(item => item.minimum_age || 21));

  return (
    <>
      {isCameraScannerEnabled && (
        <CameraScanner
          isOpen={isCameraScannerOpen}
          onClose={onCloseCameraScanner}
          onScan={onScan}
        />
      )}

      <QuickCreateModal
        isOpen={productNotFoundDialog.isOpen}
        onClose={() => {
          setProductNotFoundDialog({ isOpen: false, barcode: '' });
        }}
        barcode={productNotFoundDialog.barcode}
        onCreateProduct={onCreateProduct}
        merchantId={merchantId}
        departments={departments}
      />

      {showPaymentChoice && (
        <PaymentChoiceDialog
          isOpen={showPaymentChoice}
          onClose={onClosePaymentChoice}
          onCashSelected={onCashSelected}
          onEbtSelected={onEbtSelected}
          onCustomerTerminalSelected={onCustomerTerminalSelected}
          order={order}
          waitingForCustomer={waitingForCustomer}
          customerSelectedMethod={customerSelectedMethod}
        />
      )}

      {showPayment && (
        <PaymentModal
          isOpen={showPayment}
          onClose={onClosePayment}
          totals={totals}
          onProcessPayment={onProcessPayment}
          onStartInteractivePayment={onStartInteractivePayment}
          customer={customer}
          settings={settings}
          cart={cart}
          posMode={posMode}
          tableNumber={tableNumber}
          merchantId={merchantId}
          stationId={stationId}
          stationName={stationName}
          order={order}
        />
      )}

      {isAgeVerificationOpen && (
        <AgeVerificationDialog
          isOpen={isAgeVerificationOpen}
          onClose={onCloseAgeVerification}
          onVerify={onAgeVerified}
          requiredAge={requiredAge}
          restrictedItems={restrictedItems}
          settings={settings}
        />
      )}

      {isOpenItemDialogOpen && (
        <OpenItemDialog
          isOpen={isOpenItemDialogOpen}
          onClose={onCloseOpenItemDialog}
          onAddItem={onAddItem}
        />
      )}

      {!isDemo && isLocked && settings?.merchant_id && (
        <StaffLockScreen
          merchantId={settings.merchant_id}
          stationName={stationName}
          onUnlock={onUnlockStaff}
        />
      )}
    </>
  );
}