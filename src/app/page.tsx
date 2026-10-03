"use client";

import { AlertTriangle, Camera, Check, Download, Loader2, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { requiredPhotoLabels } from "@/lib/labels";

type EstimateResult = {
  inspection: {
    id: string;
    vehicle: { make: string; model: string; year: number; mileage: number };
    estimate: {
      damagedParts: string[];
      damageDescriptions: string[];
      repairActions: string[];
      paintRequired: boolean;
      estimatedLaborHours: number;
      confidence: number;
      partsCost: number;
      paintCost: number;
      laborCost: number;
      totalCost: number;
    };
  };
  disclaimer: string;
};

const steps = ["Fahrzeug", "Fotos", "Analyse", "Bericht"];

export default function Home() {
  const [step, setStep] = useState(0);
  const [vehicle, setVehicle] = useState({ make: "", model: "", year: "", mileage: "" });
  const [files, setFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(requiredPhotoLabels.map((label) => [label, null]))
  );
  const [inspectionId, setInspectionId] = useState("");
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const photosComplete = useMemo(() => requiredPhotoLabels.every((label) => files[label]), [files]);

  async function uploadInspection() {
    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      Object.entries(vehicle).forEach(([key, value]) => formData.append(key, value));
      requiredPhotoLabels.forEach((label) => {
        const file = files[label];
        if (file) formData.append(label, file);
      });

      const response = await fetch("/api/inspections", {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload fehlgeschlagen.");
      }

      setInspectionId(data.inspectionId);
      setStep(2);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload fehlgeschlagen.");
    } finally {
      setIsUploading(false);
    }
  }

  async function analyzeInspection() {
    setError("");
    setIsAnalyzing(true);

    try {
      const response = await fetch(`/api/inspections/${inspectionId}/analyze`, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analyse fehlgeschlagen.");
      }

      setResult(data);
      setStep(3);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Analyse fehlgeschlagen.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextVehicle = {
      make: String(formData.get("make") || "").trim(),
      model: String(formData.get("model") || "").trim(),
      year: String(formData.get("year") || "").trim(),
      mileage: String(formData.get("mileage") || "").trim()
    };

    if (Object.values(nextVehicle).some((value) => !value)) {
      setError("Bitte alle Fahrzeugdaten ausfüllen.");
      return;
    }

    setError("");
    setVehicle(nextVehicle);
    setStep(1);
  }

  async function downloadReport() {
    if (!result) return;

    setError("");
    setIsDownloading(true);

    try {
      const response = await fetch(`/api/inspections/${result.inspection.id}/pdf`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "PDF konnte nicht erstellt werden.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ki-schadensbericht-${result.inspection.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "PDF-Download fehlgeschlagen.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d2f7ef_0,#f8fafc_34%,#eef2f7_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              Unverbindliche KI-basierte Ersteinschätzung
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-5xl">
              Fahrzeugschaden kalkulieren
            </h1>
          </div>
          <div className="rounded-lg border border-white/70 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
            Kein Gutachten. Keine verbindliche Reparaturzusage.
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-1">
              {steps.map((label, index) => (
                <div
                  key={label}
                  className={`flex min-h-16 items-center gap-3 rounded-md border px-3 py-3 text-sm font-semibold ${
                    step === index
                      ? "border-teal-600 bg-teal-50 text-teal-900"
                      : index < step
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white">
                    {index < step ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className="hidden sm:inline lg:inline">{label}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {error ? (
              <div className="mb-5 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {step === 0 ? (
              <form onSubmit={submitVehicle} className="grid gap-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Fahrzeugdaten</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Unverbindliche KI-basierte Ersteinschätzung
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["make", "Hersteller", "BMW"],
                    ["model", "Modell", "320d"],
                    ["year", "Baujahr", "2020"],
                    ["mileage", "Kilometerstand", "64500"]
                  ].map(([key, label, placeholder]) => (
                    <label key={key} className="grid gap-2 text-sm font-semibold text-slate-800">
                      {label}
                      <input
                        name={key}
                        className="h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                        inputMode={key === "year" || key === "mileage" ? "numeric" : "text"}
                        placeholder={placeholder}
                        value={vehicle[key as keyof typeof vehicle]}
                        onChange={(event) => setVehicle({ ...vehicle, [key]: event.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <button
                  className="h-12 rounded-md bg-teal-700 px-5 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Weiter zu Fotos
                </button>
              </form>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Schadensfotos</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Unverbindliche KI-basierte Ersteinschätzung
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {requiredPhotoLabels.map((label) => (
                    <label
                      key={label}
                      className="flex min-h-28 cursor-pointer flex-col justify-between rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-teal-500 hover:bg-teal-50"
                    >
                      <span className="flex items-center gap-2 font-semibold text-slate-800">
                        <Camera className="size-4 text-teal-700" />
                        {label}
                      </span>
                      <span className="mt-3 truncate text-sm text-slate-600">
                        {files[label]?.name || "Foto auswählen"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) =>
                          setFiles({ ...files, [label]: event.target.files?.[0] || null })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    className="h-12 rounded-md border border-slate-300 px-5 font-bold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setStep(0)}
                  >
                    Zurück
                  </button>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-teal-700 px-5 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-1"
                    disabled={!photosComplete || isUploading}
                    onClick={uploadInspection}
                  >
                    {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Analyse vorbereiten
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid min-h-80 place-items-center text-center">
                <div className="max-w-md">
                  <div className="mx-auto grid size-16 place-items-center rounded-full bg-teal-50 text-teal-700">
                    {isAnalyzing ? <Loader2 className="size-8 animate-spin" /> : <Sparkles className="size-8" />}
                  </div>
                  <h2 className="mt-5 text-2xl font-bold text-slate-950">KI-Analyse starten</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Unverbindliche KI-basierte Ersteinschätzung
                  </p>
                  <button
                    className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-5 font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={isAnalyzing}
                    onClick={analyzeInspection}
                  >
                    {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Analyse starten
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 && result ? (
              <div className="grid gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">Kostenschätzung</h2>
                    <p className="mt-1 text-sm font-semibold text-teal-700">{result.disclaimer}</p>
                  </div>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={isDownloading}
                    onClick={downloadReport}
                  >
                    {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    PDF herunterladen
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    ["Teile", result.inspection.estimate.partsCost],
                    ["Lackierung", result.inspection.estimate.paintCost],
                    ["Arbeit", result.inspection.estimate.laborCost],
                    ["Gesamt", result.inspection.estimate.totalCost]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-600">{label}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-950">
                        {Number(value).toLocaleString("de-DE")} €
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <ResultList title="Beschädigte Teile" items={result.inspection.estimate.damagedParts} />
                  <ResultList title="Beschreibung" items={result.inspection.estimate.damageDescriptions} />
                  <ResultList title="Reparatur" items={result.inspection.estimate.repairActions} />
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  Arbeitszeit: <strong>{result.inspection.estimate.estimatedLaborHours} Stunden</strong> ·
                  Konfidenz: <strong>{Math.round(result.inspection.estimate.confidence * 100)} %</strong>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h3 className="font-bold text-slate-950">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-slate-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
