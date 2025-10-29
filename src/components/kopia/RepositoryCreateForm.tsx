/**
 * Repository creation form component
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Database, AlertCircle, Shield, HardDrive, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRepository,
  getAlgorithms,
  repositoryExists,
  type StorageType,
} from '@/lib/kopia/client';
import type { AlgorithmsResponse } from '@/lib/kopia/types';
import { getErrorMessage } from '@/lib/utils';

const storageOptions = [
  { value: 'filesystem', label: 'Local Filesystem', icon: HardDrive },
  { value: 's3', label: 'Amazon S3', icon: Database },
  { value: 'gcs', label: 'Google Cloud Storage', icon: Database },
  { value: 'azureBlob', label: 'Azure Blob Storage', icon: Database },
  { value: 'b2', label: 'Backblaze B2', icon: Database },
  { value: 'sftp', label: 'SFTP', icon: Database },
  { value: 'webdav', label: 'WebDAV', icon: Database },
];

interface RepositoryCreateFormProps {
  onSuccess?: () => void;
  showCard?: boolean;
}

export function RepositoryCreateForm({ onSuccess, showCard = true }: RepositoryCreateFormProps) {
  // Step state
  const [step, setStep] = useState<'storage-type' | 'storage-config' | 'password'>('storage-type');

  // Form state
  const [storageType, setStorageType] = useState<StorageType>('filesystem');
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [description, setDescription] = useState('My Repository');

  // Advanced options
  const [algorithms, setAlgorithms] = useState<AlgorithmsResponse | null>(null);
  const [hash, setHash] = useState<string>('');
  const [encryption, setEncryption] = useState<string>('');
  const [splitter, setSplitter] = useState<string>('');
  const [ecc, setEcc] = useState<string>('');
  const [eccOverheadPercent, setEccOverheadPercent] = useState<number>(0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available algorithms on mount
  useEffect(() => {
    const loadAlgorithms = async () => {
      try {
        const algos = await getAlgorithms();
        setAlgorithms(algos);
        setHash(algos.defaultHashAlgorithm);
        setEncryption(algos.defaultEncryptionAlgorithm);
        setSplitter(algos.defaultSplitterAlgorithm);
        setEcc(algos.eccAlgorithms[0] || '');
      } catch (err) {
        console.error('Failed to load algorithms:', err);
      }
    };

    void loadAlgorithms();
  }, []);

  const handleStorageTypeNext = () => {
    setError(null);
    setStep('storage-config');
  };

  const handleStorageConfigNext = async () => {
    if (!path) {
      setError('Please enter a storage path');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if repository exists at this location
      const exists = await repositoryExists({
        type: storageType,
        config: { path },
      });

      if (exists) {
        setError(
          'A repository already exists at this location. Please choose a different path or connect to the existing repository.'
        );
        setIsLoading(false);
        return;
      }

      // Repository doesn't exist, proceed to password step
      setStep('password');
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Please enter a password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createRepository({
        storage: {
          type: storageType,
          config: { path },
        },
        password,
        options: {
          blockFormat: {
            hash,
            encryption,
            splitter,
          },
          ecc: eccOverheadPercent > 0 ? ecc : undefined,
          eccOverheadPercent: eccOverheadPercent > 0 ? eccOverheadPercent : undefined,
        },
        clientOptions: {
          description,
        },
      });

      toast.success('Repository created successfully! Connecting...');

      // Clear sensitive data
      setPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error('Failed to create repository');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStorageTypeStep = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Storage Type</h3>
        <p className="text-sm text-muted-foreground">
          Choose where you want to store your backup data
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {storageOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStorageType(option.value as StorageType)}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
              storageType === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <option.icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      <Button onClick={handleStorageTypeNext} className="w-full">
        Next
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStorageConfigStep = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleStorageConfigNext();
      }}
      className="space-y-4"
    >
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('storage-type')}
          className="mb-2"
        >
          ← Back to storage type
        </Button>
        <h3 className="text-lg font-semibold">Storage Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure your {storageOptions.find((o) => o.value === storageType)?.label}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="path" className="text-sm">
          Repository Path <span className="text-destructive">*</span>
        </Label>
        <Input
          id="path"
          type="text"
          placeholder={
            storageType === 'filesystem' ? '/backup/kopia-repository' : 's3://bucket-name/path'
          }
          value={path}
          onChange={(e) => setPath(e.target.value)}
          required
          className="font-mono text-sm"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {storageType === 'filesystem'
            ? 'Local directory where repository files will be stored'
            : 'Remote path for your backup storage'}
        </p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Verifying...
          </>
        ) : (
          <>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('storage-config')}
          className="mb-2"
        >
          ← Back to configuration
        </Button>
        <h3 className="text-lg font-semibold">Create Repository Password</h3>
        <p className="text-sm text-muted-foreground">
          Choose a strong password to encrypt your repository
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm">
          Password <span className="text-destructive">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter repository password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-sm">
          Confirm Password <span className="text-destructive">*</span>
        </Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Enter password again"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Warning:</strong> Password recovery is impossible. Store it securely!
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm">
          Repository Description
        </Label>
        <Input
          id="description"
          type="text"
          placeholder="My Repository"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Helps distinguish between multiple repositories
        </p>
      </div>

      {/* Advanced Options */}
      {algorithms && (
        <Accordion type="single" collapsible>
          <AccordionItem value="advanced">
            <AccordionTrigger className="text-sm">Advanced Options</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="encryption" className="text-sm">
                    Encryption Algorithm
                  </Label>
                  <Select value={encryption} onValueChange={setEncryption}>
                    <SelectTrigger id="encryption">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {algorithms.encryptionAlgorithms.map((algo: string) => (
                        <SelectItem key={algo} value={algo}>
                          {algo}
                          {algo === algorithms.defaultEncryptionAlgorithm && ' (default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hash" className="text-sm">
                    Hash Algorithm
                  </Label>
                  <Select value={hash} onValueChange={setHash}>
                    <SelectTrigger id="hash">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {algorithms.hashAlgorithms.map((algo: string) => (
                        <SelectItem key={algo} value={algo}>
                          {algo}
                          {algo === algorithms.defaultHashAlgorithm && ' (default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="splitter" className="text-sm">
                    Splitter Algorithm
                  </Label>
                  <Select value={splitter} onValueChange={setSplitter}>
                    <SelectTrigger id="splitter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {algorithms.splitterAlgorithms.map((algo: string) => (
                        <SelectItem key={algo} value={algo}>
                          {algo}
                          {algo === algorithms.defaultSplitterAlgorithm && ' (default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ecc-overhead" className="text-sm">
                    Error Correction Overhead
                  </Label>
                  <Select
                    value={eccOverheadPercent.toString()}
                    onValueChange={(value) => setEccOverheadPercent(parseInt(value))}
                  >
                    <SelectTrigger id="ecc-overhead">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Disabled</SelectItem>
                      <SelectItem value="1">1%</SelectItem>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {eccOverheadPercent > 0 && algorithms.eccAlgorithms.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="ecc" className="text-sm">
                    Error Correction Algorithm
                  </Label>
                  <Select value={ecc} onValueChange={setEcc}>
                    <SelectTrigger id="ecc">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {algorithms.eccAlgorithms.map((algo: string) => (
                        <SelectItem key={algo} value={algo}>
                          {algo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    [EXPERIMENTAL] Error correction can help protect against data corruption
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Creating Repository...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Create Repository
          </>
        )}
      </Button>
    </form>
  );

  const formContent = (
    <div className="space-y-4">
      {step === 'storage-type' && renderStorageTypeStep()}
      {step === 'storage-config' && renderStorageConfigStep()}
      {step === 'password' && renderPasswordStep()}
    </div>
  );

  if (!showCard) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create New Repository</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
