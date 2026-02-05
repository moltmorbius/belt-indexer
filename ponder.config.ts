import { createConfig } from "ponder";
import { http } from "viem";
import { EntryPointAbi } from "./abis/EntryPointAbi";
import { SimpleAccountFactoryAbi } from "./abis/SimpleAccountFactoryAbi";

/**
 * Belt AA Indexer — PulseChain Configuration
 *
 * Indexes ERC-4337 EntryPoint events for Belt's account abstraction ecosystem.
 *
 * EntryPoint versions:
 *   v0.7: 0x0000000071727De22E5E9d8BAf0edAc6f37da032 (canonical)
 *   v0.8: 0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108
 *   v0.9: 0x433709009B8330FDa32311DF1C2AFA402eD8D009
 *
 * SimpleAccountFactories:
 *   v0.7: 0xC03f10876B6f9B2c6927EA8b2ac9552c6bb2Ce68
 *   v0.8: 0x13E9ed32155810FDbd067D4522C492D6f68E5944
 *   v0.9: 0xAD07bbb7bEA77E323C838481F668d22864e9F66E
 *
 * Executors:
 *   executor1: 0x1071cE6Fcc1A042208CCB60D5D417c2BA9C8E750
 *   executor2: 0x668E2e474F7C602e86D256A85A2890a0eaDF205F
 *   utility:   0x1BBc4B7CB2eb49480C200eAE411750572e6F30D9
 *
 * Account implementations:
 *   v0.8: 0x28426d752372D68d34340bd94390950DcE3C9ec3
 *   v0.9: 0xCc5C9b932F18D8Dd08Ee2FFFEF52b09583E247c0
 */

// Start block — set to ~1 week before 2026-02-02 on PulseChain (~10s block time).
// Current head: ~25,687,526. One week ≈ 60,480 blocks.
const START_BLOCK = 25_627_000;

export default createConfig({
  chains: {
    pulsechain: {
      id: 369,
      transport: http(process.env.PONDER_RPC_URL_369),
    },
  },
  contracts: {
    // --- EntryPoint v0.7 (canonical ERC-4337) ---
    EntryPointV07: {
      abi: EntryPointAbi,
      chain: "pulsechain",
      address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
      startBlock: START_BLOCK,
    },
    // --- EntryPoint v0.8 ---
    EntryPointV08: {
      abi: EntryPointAbi,
      chain: "pulsechain",
      address: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108",
      startBlock: START_BLOCK,
    },
    // --- EntryPoint v0.9 ---
    EntryPointV09: {
      abi: EntryPointAbi,
      chain: "pulsechain",
      address: "0x433709009B8330FDa32311DF1C2AFA402eD8D009",
      startBlock: START_BLOCK,
    },
    // --- Belt SimpleAccountFactory v0.7 ---
    BeltFactoryV07: {
      abi: SimpleAccountFactoryAbi,
      chain: "pulsechain",
      address: "0xC03f10876B6f9B2c6927EA8b2ac9552c6bb2Ce68",
      startBlock: START_BLOCK,
    },
    // --- Belt SimpleAccountFactory v0.8 ---
    BeltFactoryV08: {
      abi: SimpleAccountFactoryAbi,
      chain: "pulsechain",
      address: "0x13E9ed32155810FDbd067D4522C492D6f68E5944",
      startBlock: START_BLOCK,
    },
    // --- Belt SimpleAccountFactory v0.9 ---
    BeltFactoryV09: {
      abi: SimpleAccountFactoryAbi,
      chain: "pulsechain",
      address: "0xAD07bbb7bEA77E323C838481F668d22864e9F66E",
      startBlock: START_BLOCK,
    },
  },
});
