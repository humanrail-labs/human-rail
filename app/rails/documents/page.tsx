"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCluster } from "@/lib/solana/cluster-context";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { FileCheck, Plus, RefreshCw, CheckCircle2, Shield, Clock, AlertTriangle, Upload } from "lucide-react";
import { toast } from "sonner";

export default function DocumentsPage() {
  const { connected } = useWallet();
  const { cluster } = useCluster();
  const { hasProfile } = useHumanProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentHash, setDocumentHash] = useState("");
  const [documentName, setDocumentName] = useState("");

  const handleSignDocument = async () => {
    toast.info("Coming Soon", {
      description: "Document signing will be available in the next release",
    });
    setDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                  <FileCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Document Registry</h1>
                  <p className="text-neutral-400">Sign documents with verified identity</p>
                </div>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!connected || !hasProfile}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Sign Document
                </Button>
              </DialogTrigger>
              <DialogContent className="border-neutral-800 bg-neutral-900">
                <DialogHeader>
                  <DialogTitle>Sign Document</DialogTitle>
                  <DialogDescription>Create an on-chain signature for a document</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Document Name</Label>
                    <Input
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="Contract Agreement..."
                      className="border-neutral-700 bg-neutral-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Document Hash (SHA-256)</Label>
                    <Input
                      value={documentHash}
                      onChange={(e) => setDocumentHash(e.target.value)}
                      placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                      className="border-neutral-700 bg-neutral-800 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSignDocument} className="bg-emerald-600 hover:bg-emerald-700">
                    <FileCheck className="mr-2 h-4 w-4" />
                    Sign Document
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Not Connected State */}
          {!connected && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileCheck className="mb-4 h-16 w-16 text-neutral-600" />
                <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to sign documents</p>
                <WalletMultiButton />
              </CardContent>
            </Card>
          )}

          {/* No Profile Warning */}
          {connected && !hasProfile && (
            <Card className="mb-6 border-yellow-900/50 bg-yellow-950/20">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Human Profile Required</p>
                    <p className="mt-1 text-neutral-400">
                      Create a human profile to sign documents.{" "}
                      <a href="/human" className="text-yellow-500 underline">Go to Human Dashboard →</a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          {connected && hasProfile && (
            <>
              <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Shield className="mb-3 h-8 w-8 text-emerald-500" />
                    <h3 className="font-semibold">Verified Signatures</h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      Signatures linked to verified human identities
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Clock className="mb-3 h-8 w-8 text-blue-500" />
                    <h3 className="font-semibold">Timestamped</h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      Immutable on-chain timestamps for legal validity
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Upload className="mb-3 h-8 w-8 text-purple-500" />
                    <h3 className="font-semibold">Agent Delegation</h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      Authorized agents can sign on your behalf
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Empty State */}
              <Card className="border-neutral-800 bg-neutral-900/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileCheck className="mb-4 h-16 w-16 text-emerald-500" />
                  <h2 className="mb-2 text-xl font-semibold">No Signed Documents</h2>
                  <p className="mb-6 text-neutral-400">Sign your first document to create a verifiable record</p>
                  <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Sign Document
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Info Card */}
          <Card className="mt-8 border-emerald-900/50 bg-emerald-950/20">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <FileCheck className="h-5 w-5 shrink-0 text-emerald-400" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-400">Document Registry Rail</p>
                  <p className="mt-1 text-neutral-400">
                    Sign documents on-chain with your verified HumanRail identity. Each signature is timestamped, 
                    immutable, and linked to your human profile for legally-verifiable attestation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
