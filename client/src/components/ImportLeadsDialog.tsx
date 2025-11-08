import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileText, AlertCircle, Download } from "lucide-react";
import Papa from "papaparse";
import type { Campaign } from "@shared/schema";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Campaign[];
}

interface CSVRow {
  name: string;
  email: string;
  phone: string;
  company?: string;
  role: string;
  timeSpentOnWorkshop?: string;
  location?: string;
}

export function ImportLeadsDialog({ open, onOpenChange, campaigns }: ImportLeadsDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [campaignId, setCampaignId] = useState<string>("");
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    const templateData = [
      {
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        company: "Acme Corp",
        role: "Manager",
        timeSpentOnWorkshop: "2 hours",
        location: "New York"
      },
      {
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+0987654321",
        company: "Tech Inc",
        role: "Senior Developer",
        timeSpentOnWorkshop: "3 hours",
        location: "San Francisco"
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "leads_import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template Downloaded",
      description: "Fill in the template with your lead data and import it",
    });
  };

  const importMutation = useMutation({
    mutationFn: async (data: { leads: CSVRow[]; campaignId: string }) => {
      // Add default status to all leads
      const leadsWithDefaults = data.leads.map((lead) => ({
        ...lead,
        status: "not_picked",
      }));

      return await apiRequest("POST", "/api/leads/bulk", { 
        leads: leadsWithDefaults, 
        campaignId: data.campaignId 
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/search"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      const count = Array.isArray(data) ? data.length : parsedData.length;
      toast({
        title: "Success",
        description: `Imported ${count} leads successfully`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import leads. Please check your CSV format and try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsedData([]);
    setErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validationErrors: string[] = [];
        const validRows: CSVRow[] = [];

        results.data.forEach((row: any, index: number) => {
          // Check required fields
          if (!row.name || !row.phone || !row.role) {
            validationErrors.push(
              `Row ${index + 1}: Missing required fields (name, phone, role)`
            );
          } else {
            validRows.push({
              name: row.name.trim(),
              email: row.email?.trim() || "",
              phone: row.phone.trim(),
              company: row.company?.trim() || undefined,
              role: row.role.trim(),
              timeSpentOnWorkshop: row.timeSpentOnWorkshop?.trim() || undefined,
              location: row.location?.trim() || undefined,
            });
          }
        });

        setErrors(validationErrors);
        setParsedData(validRows);
      },
      error: (error) => {
        toast({
          title: "Error",
          description: `Failed to parse CSV: ${error.message}`,
          variant: "destructive",
        });
      },
    });
  };

  const handleImport = () => {
    if (!campaignId) {
      toast({
        title: "Error",
        description: "Please select a campaign",
        variant: "destructive",
      });
      return;
    }

    if (parsedData.length === 0) {
      toast({
        title: "Error",
        description: "No valid data to import",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({ leads: parsedData, campaignId });
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData([]);
    setErrors([]);
    setCampaignId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign">Campaign</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger id="campaign" data-testid="select-import-campaign">
                <SelectValue placeholder={campaigns.length === 0 ? "No campaigns available" : "Select a campaign"} />
              </SelectTrigger>
              <SelectContent>
                {campaigns.length === 0 ? (
                  <SelectItem value="no-campaigns" disabled>
                    No campaigns available
                  </SelectItem>
                ) : (
                  campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {campaigns.length === 0 && (
              <p className="text-sm text-destructive">
                Please create a campaign first before importing leads
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                data-testid="input-csv-file"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Required columns: name, phone, role. Optional: email, company, timeSpentOnWorkshop, location
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="mt-2"
              data-testid="button-download-template"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {selectedFile && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
              </div>

              {errors.length > 0 && (
                <div className="space-y-1 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Validation Errors</span>
                  </div>
                  <ul className="text-sm text-destructive space-y-1 ml-6 list-disc">
                    {errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {errors.length > 5 && (
                      <li>... and {errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {parsedData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Preview ({parsedData.length} valid rows)
                  </p>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 whitespace-nowrap">Name</th>
                          <th className="text-left p-2 whitespace-nowrap">Phone</th>
                          <th className="text-left p-2 whitespace-nowrap">Role</th>
                          <th className="text-left p-2 whitespace-nowrap">Email</th>
                          <th className="text-left p-2 whitespace-nowrap">Company</th>
                          <th className="text-left p-2 whitespace-nowrap">Time on Workshop</th>
                          <th className="text-left p-2 whitespace-nowrap">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2 whitespace-nowrap">{row.name}</td>
                            <td className="p-2 whitespace-nowrap">{row.phone}</td>
                            <td className="p-2 whitespace-nowrap">{row.role}</td>
                            <td className="p-2 whitespace-nowrap">{row.email || "-"}</td>
                            <td className="p-2 whitespace-nowrap">{row.company || "-"}</td>
                            <td className="p-2 whitespace-nowrap">{row.timeSpentOnWorkshop || "-"}</td>
                            <td className="p-2 whitespace-nowrap">{row.location || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 5 && (
                      <div className="p-2 bg-muted text-sm text-center">
                        ... and {parsedData.length - 5} more rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} data-testid="button-cancel-import">
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!campaignId || parsedData.length === 0 || importMutation.isPending}
              data-testid="button-import-leads"
            >
              {importMutation.isPending ? (
                <>Importing...</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import {parsedData.length} Leads
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
