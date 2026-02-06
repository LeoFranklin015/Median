import { JustaName, type ChainId } from "@justaname.id/sdk";

const main = async () => {
  const configuration = {
    networks: [
      {
        chainId: 11155111 as ChainId,
        providerUrl: "https://sepolia.drpc.org",
      },
    ],
    ensDomains: [
      {
        ensDomain: "testing1.eth",
        chainId: 11155111 as ChainId,
      },
    ],
  };

  const justaName = JustaName.init(configuration);

  const params = {
    username: "hii",
    ensDomain: "median.eth",
    chainId: 11155111 as ChainId,
    addresses: {
      "60": "0x23d3957BE879aBa6ca925Ee4F072d1A8C4E8c890", 
      "2147525809":"0x23d3957BE879aBa6ca925Ee4F072d1A8C4E8c890",
      "2147492101":"0x23d3957BE879aBa6ca925Ee4F072d1A8C4E8c890" 
    },
    apiKey: process.env.NEXT_PUBLIC_JUSTA_NAME_API_KEY,
    overrideSignatureCheck: true, 
  };

  const addedUser = await justaName.subnames.addSubname(params);

  console.log(addedUser);
};

main();