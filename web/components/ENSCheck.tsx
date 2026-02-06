"use client";

import { useENSCheck } from "@/hooks/useENSCheck";
import { ENSModal } from "./ENSModal";

export function ENSCheck() {
  const { isModalOpen, address, handleSuccess, handleClose } = useENSCheck();

  if (!address) return null;

  return (
    <ENSModal
      isOpen={isModalOpen}
      onClose={handleClose}
      address={address}
      onSuccess={handleSuccess}
    />
  );
}
