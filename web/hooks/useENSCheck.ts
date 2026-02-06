"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { hasENSName, getPrimaryName, getMedianSubname } from "@/lib/ens";

export function useENSCheck() {
  const { address, isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Reset check status when address changes
  useEffect(() => {
    if (address) {
      setHasChecked(false);
      setEnsName(null);
    }
  }, [address]);

  useEffect(() => {
    const checkENS = async () => {
      // Only check if connected, has address, and hasn't checked yet
      if (!isConnected || !address || hasChecked) return;

      setIsChecking(true);

      try {
        // Check for primary name first
        const primaryName = await getPrimaryName(address);
        if (primaryName) {
          setEnsName(primaryName);
          setHasChecked(true);
          setIsChecking(false);
          return;
        }

        // Check for median.eth subname
        const medianSubname = await getMedianSubname(address);
        if (medianSubname) {
          setEnsName(medianSubname);
          setHasChecked(true);
          setIsChecking(false);
          return;
        }

        // No ENS name found, show modal
        setIsModalOpen(true);
        setHasChecked(true);
      } catch (error) {
        console.error("Error checking ENS:", error);
        // On error, don't block the user - just mark as checked
        setHasChecked(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkENS();
  }, [address, isConnected, hasChecked]);

  const handleSuccess = (subname: string) => {
    setEnsName(subname);
    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  // Allow manual trigger to recheck
  const recheckENS = () => {
    setHasChecked(false);
    setEnsName(null);
  };

  return {
    isModalOpen,
    isChecking,
    ensName,
    address: address || "",
    handleSuccess,
    handleClose,
    recheckENS,
  };
}
