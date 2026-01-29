/**
 * ERC-4337 EntryPoint ABI — events only.
 * These event signatures are identical across v0.7, v0.8, and v0.9 EntryPoints.
 *
 * Sources:
 * - https://github.com/eth-infinitism/account-abstraction (v0.7)
 * - v0.8/v0.9 use the same event signatures
 */
export const EntryPointAbi = [
  {
    type: "event",
    name: "UserOperationEvent",
    inputs: [
      {
        name: "userOpHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "paymaster",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "success",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "actualGasCost",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "actualGasUsed",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "AccountDeployed",
    inputs: [
      {
        name: "userOpHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "factory",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "paymaster",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
  },
  {
    type: "event",
    name: "UserOperationRevertReason",
    inputs: [
      {
        name: "userOpHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "revertReason",
        type: "bytes",
        indexed: false,
        internalType: "bytes",
      },
    ],
  },
  {
    type: "event",
    name: "UserOperationPrefundTooLow",
    inputs: [
      {
        name: "userOpHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "BeforeExecution",
    inputs: [],
  },
] as const;
