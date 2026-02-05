export const SimpleAccountFactoryAbi = [
  {
    type: "event",
    name: "AccountCreated",
    inputs: [
      { indexed: true, name: "account", type: "address" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "salt", type: "uint256" },
    ],
  },
] as const;
