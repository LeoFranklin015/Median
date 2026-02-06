import { JustaName, type ChainId } from "@justaname.id/sdk";

const MEDIAN_ENS_DOMAIN = "median.eth";
const CHAIN_ID = 11155111 as ChainId; // Sepolia

// Initialize JustaName instance
export const initJustaName = () => {
  const configuration = {
    networks: [
      {
        chainId: CHAIN_ID,
        providerUrl: "https://sepolia.drpc.org",
      },
    ],
    ensDomains: [
      {
        ensDomain: MEDIAN_ENS_DOMAIN,
        chainId: CHAIN_ID,
      },
      
    ],
  };

  return JustaName.init(configuration);
};

// Check if an address has a primary ENS name
export const getPrimaryName = async (address: string): Promise<string | null> => {
  try {
    const justaName = initJustaName();
    const response = await justaName.subnames.getPrimaryNameByAddress({
      address,
      chainId: CHAIN_ID,
    });
    return response?.name || null;
  } catch (error) {
    console.error("Error getting primary name:", error);
    return null;
  }
};

// Check if an address has a subname from median.eth
export const getMedianSubname = async (address: string): Promise<string | null> => {
  try {
    const justaName = initJustaName();
    const response = await justaName.subnames.getSubnamesByAddress({
      address,
      chainId: CHAIN_ID,
    });

    // Filter for median.eth subnames
    const medianSubname = response?.subnames?.find(
      (subname) => subname.ens.endsWith(`.${MEDIAN_ENS_DOMAIN}`)
    );

    return medianSubname?.ens || null;
  } catch (error) {
    console.error("Error getting median subname:", error);
    return null;
  }
};

// Check if a username is available on median.eth
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const justaName = initJustaName();
    const response = await justaName.subnames.isSubnameAvailable({
      subname: `${username}.${MEDIAN_ENS_DOMAIN}`,
      chainId: CHAIN_ID,
    });
    return response?.isAvailable || false;
  } catch (error) {
    console.error("Error checking username availability:", error);
    return false;
  }
};

// Add a subname on median.eth
export const addMedianSubname = async (
  username: string,
  address: string,
  apiKey: string
): Promise<{ success: boolean; subname?: string; error?: string }> => {
  try {
    const justaName = initJustaName();

    const params = {
      username,
      ensDomain: MEDIAN_ENS_DOMAIN,
      chainId: CHAIN_ID,
      addresses: {
        "60": address, // ETH address (coin type 60)
        "2147525809": address, // Base
        "2147492101": address, // Arbitrum
      },
      apiKey: apiKey,
      overrideSignatureCheck: true,
    };

    await justaName.subnames.addSubname(params);

    return {
      success: true,
      subname: `${username}.${MEDIAN_ENS_DOMAIN}`,
    };
  } catch (error: any) {
    console.error("Error adding subname:", error);
    return {
      success: false,
      error: error?.message || "Failed to add subname",
    };
  }
};

// Check if address has ENS name (primary or median.eth subname)
export const hasENSName = async (address: string): Promise<boolean> => {
  const primaryName = await getPrimaryName(address);
  if (primaryName) return true;

  const medianSubname = await getMedianSubname(address);
  return !!medianSubname;
};
