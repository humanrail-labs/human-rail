"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { useDocumentRegistry } from "@/lib/hooks/use-document-registry";
import {
  FileCheck,
  Plus,
  RefreshCw,
  Shield,
  Clock,
  AlertTriangle,
  Upload,
  ExternalLink,
  Loader2,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentsPage() {
  const { connected, publicKey } = useWallet();
  const { hasProfile } = useHumanProfile();
  const {
    documents,
    signatures,
    loading,
    registerAndSign,
    refetch,
  } = useDocumentRegistry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentHash, setDocumentHash] = useState("");
  const [documentSchema, setDocumentSchema] = useState("document_v1");
  const [signerRole, setSignerRole] = useState("signer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hash a file client-side
  const handleFileHash = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    setDocumentHash(hashHex);
    toast.success("File hashed", { description: `SHA-256: ${hashHex.slice(0, 16)}...` });
  }, []);

  const handleSignDocument = async () => {
    if (!documentHash || documentHash.length !== 64) {
      toast.error("Invalid hash", { description: "Please enter a valid 64-character SHA-256 hash" });
      return;
    }

    setIsSubmitting(true);
    try {
      const txSig = await registerAndSign(documentHash, documentSchema, signerRole);
      toast.success("Document signed!", {
        description: (
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            View on Explorer <ExternalLink className="h-3 w-3" />
          </a>
        ),
      });
      setDialogOpen(false);
      setDocumentHash("");
    } catch (err) {
      console.error("Sign document error:", err);
      const message = err instanceof Error ? err.message : "Unknown error";

      // Handle specific errors
      if (message.includes("already in use")) {
        toast.error("Document already registered", {
          description: "This document hash has already been registered on-chain",
        });
      } else if (message.includes("AccountNotInitialized")) {
        toast.error("Human profile required", {
          description: "Please create a human profile first",
        });
      } else {
        toast.error("Failed to sign document", { description: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Finalized": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Draft": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "Disputed": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-neutral-500/20 text-neutral-400 border-neutral-500/30";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "VerifiedSigner": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "AgentOnBehalf": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-neutral-500/20 text-neutral-400 border-neutral-500/30";
    }
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={refetch}
                disabled={loading}
                className="border-neutral-700"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
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
                    <DialogDescription>
                      Register and sign a document on-chain with your verified human identity
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* File upload for hashing */}
                    <div className="space-y-2">
                      <Label>Upload File to Hash (optional)</Label>
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileHash(file);
                        }}
                        className="border-neutral-700 bg-neutral-800"
                      />
                      <p className="text-xs text-neutral-500">
                        File is hashed locally - never uploaded
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Document Hash (SHA-256)</Label>
                      <Input
                        value={documentHash}
                        onChange={(e) => setDocumentHash(e.target.value.toLowerCase().replace(/[^0-9a-f]/g, ""))}
                        placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
                        className="border-neutral-700 bg-neutral-800 font-mono text-xs"
                        maxLength={64}
                      />
                      <p className="text-xs text-neutral-500">
                        {documentHash.length}/64 characters
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Schema</Label>
                        <Input
                          value={documentSchema}
                          onChange={(e) => setDocumentSchema(e.target.value)}
                          placeholder="contract_v1"
                          className="border-neutral-700 bg-neutral-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Signer Role</Label>
                        <Input
                          value={signerRole}
                          onChange={(e) => setSignerRole(e.target.value)}
                          placeholder="signer"
                          className="border-neutral-700 bg-neutral-800"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSignDocument}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={isSubmitting || documentHash.length !== 64}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing...
                        </>
                      ) : (
                        <>
                          <FileCheck className="mr-2 h-4 w-4" />
                          Sign Document
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
                      <a href="/human" className="text-yellow-500 underline">
                        Go to Human Dashboard →
                      </a>
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

              {/* Signatures List */}
              {signatures.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold">Your Signatures</h2>
                  <div className="space-y-3">
                    {signatures.map((sig) => (
                      <Card key={sig.pubkey.toBase58()} className="border-neutral-800 bg-neutral-900/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-neutral-500" />
                                <code className="text-sm text-neutral-300">
                                  {sig.document.toBase58().slice(0, 8)}...{sig.document.toBase58().slice(-8)}
                                </code>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className={getTierColor(sig.tier)}>
                                  {sig.tier === "VerifiedSigner" ? "Verified Human" : sig.tier}
                                </Badge>
                                <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                                  Role: {sig.role}
                                </Badge>
                                {sig.humanScoreAtSigning > 0 && (
                                  <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                                    Score: {sig.humanScoreAtSigning}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className={getStatusColor(sig.status)}>
                                {sig.status}
                              </Badge>
                              <p className="mt-1 text-xs text-neutral-500">
                                {formatDate(sig.signedAt)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents List */}
              {documents.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-4 text-xl font-semibold">Documents You Created</h2>
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <Card key={doc.pubkey.toBase58()} className="border-neutral-800 bg-neutral-900/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <FileCheck className="h-4 w-4 text-emerald-500" />
                                <code className="text-sm text-neutral-300">
                                  {doc.docHashHex.slice(0, 16)}...{doc.docHashHex.slice(-8)}
                                </code>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                                  {doc.schema}
                                </Badge>
                                <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                                  {doc.signatureCount} signature{doc.signatureCount !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className={getStatusColor(doc.status)}>
                                {doc.status}
                              </Badge>
                              <p className="mt-1 text-xs text-neutral-500">
                                {formatDate(doc.createdAt)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {signatures.length === 0 && documents.length === 0 && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileCheck className="mb-4 h-16 w-16 text-emerald-500" />
                    <h2 className="mb-2 text-xl font-semibold">No Signed Documents</h2>
                    <p className="mb-6 text-neutral-400">
                      Sign your first document to create a verifiable record
                    </p>
                    <Button
                      onClick={() => setDialogOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Sign Document
                    </Button>
                  </CardContent>
                </Card>
              )}
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
                    Sign documents on-chain with your verified HumanRail identity. Each signature is
                    timestamped, immutable, and linked to your human profile for legally-verifiable
                    attestation.
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