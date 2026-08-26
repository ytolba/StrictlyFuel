import { createContext, useContext, useEffect, useState } from "react";
import { Platform, Alert } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
} from "react-native-purchases";
import REVENUECAT_API_KEY from "@env";

// Use your RevenueCat API keys
const APIKeys = {
  apple: "appl_VmOPptSHnlPQZyKexioqRSiPuBX",
};

interface RevenueCatProps {
  purchasePackage?: (pack: PurchasesPackage) => Promise<{
    customerInfo?: CustomerInfo;
    success: boolean;
    error?: string;
  }>;
  restorePermissions?: () => Promise<CustomerInfo>;
  user: UserState;
  packages: PurchasesPackage[];
}

export interface UserState {
  cookies: number;
  items: string[];
  pro: boolean;
}

const RevenueCatContext = createContext<RevenueCatProps | null>(null);

// Export context for easy usage
export const useRevenueCat = (): RevenueCatProps => {
  console.log("fetching context");
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
};

// Provide RevenueCat functions to our app
export const RevenueCatProvider = ({ children }: any) => {
  const [user, setUser] = useState<UserState>({
    cookies: 0,
    items: [],
    pro: false,
  });
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Purchases.configure({ apiKey: APIKeys.apple });

      setIsReady(true);

      // Use more logging during debug if want!
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      // Listen for customer updates
      Purchases.addCustomerInfoUpdateListener(async (info) => {
        updateCustomerInformation(info);
      });

      // Load all offerings and the user object with entitlements
      await loadOfferings();
    };
    init();
  }, []);

  // Load all offerings a user can (currently) purchase
  const loadOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        console.log("Available offerings:", offerings.current);
        setPackages(offerings.current.availablePackages);
      } else {
        console.log("No offerings available.");
        if (!__DEV__) {
          Alert.alert(
            "No Offerings Found",
            "There are no available offerings. Please ensure products are correctly configured in App Store Connect and RevenueCat."
          );
        }
      }
    } catch (error: any) {
      console.error("Error loading offerings:", error);
      if (!__DEV__) {
        Alert.alert(
          "Configuration Error",
          `Failed to load offerings: ${error.message}. Ensure products are 'Ready to Submit' or 'Approved'.`
        );
      }
    }
  };

  // Update user state based on previous purchases
  const updateCustomerInformation = async (customerInfo: CustomerInfo) => {
    const newUser: UserState = { cookies: user.cookies, items: [], pro: false };

    if (customerInfo?.entitlements.active["pro"] !== undefined) {
      newUser.pro = true;
    }

    setUser(newUser);
  };

  // Purchase a package
  const purchasePackage = async (pack: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);

      // Simply return the customer info - let the UI handle alerts
      if (customerInfo?.entitlements.active["pro"]) {
        setUser((prevUser) => ({ ...prevUser, pro: true }));
      }
      return { customerInfo, success: true };
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error("Purchase failed:", e);
      }
      return {
        success: false,
        error: e.userCancelled ? "cancelled" : e.message,
      };
    }
  };

  // Restore previous purchases
  const restorePermissions = async (): Promise<CustomerInfo> => {
    const customer = await Purchases.restorePurchases();
    return customer; // Ensure CustomerInfo is returned
  };

  const value: RevenueCatProps = {
    restorePermissions, // Now correctly typed
    user,
    packages,
    purchasePackage,
  };

  // Return empty fragment if provider is not ready (Purchase not yet initialised)

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
};
