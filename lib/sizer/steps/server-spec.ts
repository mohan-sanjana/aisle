/**
 * Step 12 — Server spec per replica.
 *
 * Two form factors (sizing-math.md §12):
 *   8-GPU SXM/OAM host (workhorse): dual-socket Xeon/EPYC, 2 TB DDR5,
 *     8 NVMe drives, 8× CX-7 400G + 2× 100 GbE.
 *   1-4 GPU PCIe server:           single CPU, 512 GB - 1 TB RAM,
 *     4-10 TB NVMe, 2× 100 GbE.
 */

import type { Accelerator } from "@/lib/catalog";
import type { ServerSpec, SizerInput } from "../types";

export function buildServerSpec(args: {
  input: SizerInput;
  accelerator: Accelerator;
  gpu_count: number;
  weights_gb: number;
  kv_total_gb: number;
}): ServerSpec {
  const { input, accelerator, gpu_count, weights_gb, kv_total_gb } = args;
  const vramPer = accelerator.memory_gb ?? 0;
  const totalGpuVram = gpu_count * vramPer;

  const isBigBox = gpu_count >= 5; // 8-GPU class
  const isMidBox = gpu_count >= 2;

  // RAM: 2× total GPU VRAM, floor 1 TB on big boxes; 512 GB - 1 TB on small.
  let ram_gb: number;
  if (isBigBox) {
    ram_gb = Math.max(1024, 2 * totalGpuVram);
    if (input.kv_offload) ram_gb = Math.max(ram_gb, 3072);
    ram_gb = roundUp(ram_gb, 256);
  } else if (isMidBox) {
    ram_gb = Math.max(512, 2 * totalGpuVram);
    ram_gb = roundUp(ram_gb, 128);
  } else {
    // 1-GPU PCIe
    ram_gb = totalGpuVram >= 80 ? 1024 : 512;
  }

  // NVMe: max(10 TB, 4×W + 2×KV_total) on big box; smaller floors elsewhere.
  const nvmeNeededGB = 4 * weights_gb + 2 * kv_total_gb;
  let local_nvme_tb: number;
  if (isBigBox) {
    local_nvme_tb = Math.max(10, nvmeNeededGB / 1000);
    local_nvme_tb = roundUp(local_nvme_tb, 2);
  } else if (isMidBox) {
    local_nvme_tb = Math.max(8, nvmeNeededGB / 1000);
  } else {
    local_nvme_tb = Math.max(4, nvmeNeededGB / 1000);
  }
  local_nvme_tb = Math.round(local_nvme_tb);

  // CPU class
  const cpu_class = isBigBox
    ? "Dual-socket Xeon Platinum 8568Y+ (or 2× EPYC 9554), ≥48c/socket"
    : isMidBox
      ? "Single Xeon Gold 6548Y+ (or EPYC 9354), ≥32c"
      : "Single Xeon Gold 6526Y (or EPYC 9354), ≥24c";

  // NIC
  const nic = isBigBox
    ? `${gpu_count}× ConnectX-7 400 Gb (compute fabric) + 2× 100 GbE (frontend)`
    : isMidBox
      ? "2× 100 GbE bonded (frontend + storage)"
      : "2× 100 GbE bonded";

  return {
    cpu_class,
    ram_gb,
    gpu_id: accelerator.id,
    gpu_count,
    nic,
    local_nvme_tb,
  };
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}
