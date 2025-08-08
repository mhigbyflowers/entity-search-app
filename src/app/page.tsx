"use client";

import React, { useState } from "react";
import Papa from "papaparse";

type CSVRow = Record<string, string | number | boolean | null>;

interface SearchResult {
  [key: string]: unknown;
}

export default function SearchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setRows([]);
    setResult(null);
    setError(null);

    if (!f) return;

    Papa.parse<CSVRow>(f, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (res) => {
        const parsed = (res.data as CSVRow[]).filter((r) =>
          Object.values(r).some((v) => (v ?? "").toString().trim() !== "")
        );
        setRows(parsed);
      },
      error: (err) => {
        setError(err.message || "Failed to parse CSV");
      },
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!file || rows.length === 0) {
        throw new Error("Please select a non-empty CSV file.");
      }

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          totalRows: rows.length,
          rows, // send parsed CSV rows to the API
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "API request failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto" }}>
      <h1>Entity Search</h1>
      <form onSubmit={handleSearch}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          style={{ width: "70%", padding: "0.5rem" }}
        />
        <button
          type="submit"
          disabled={loading || !file}
          style={{ marginLeft: "1rem" }}
        >
          {loading ? "Submitting..." : "Upload and Search"}
        </button>
      </form>

      {file && (
        <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#555" }}>
          Selected: {file.name} {rows.length > 0 ? `• ${rows.length} rows` : ""}
        </div>
      )}

      {error && <div style={{ color: "red", marginTop: "1rem" }}>{error}</div>}

      {rows.length > 0 && (
        <details style={{ marginTop: "1rem" }}>
          <summary>Preview first 5 rows</summary>
          <pre style={{ background: "#f4f4f4", padding: "1rem" }}>
            {JSON.stringify(rows.slice(0, 5), null, 2)}
          </pre>
        </details>
      )}

      {result && (
        <pre style={{ marginTop: "1rem", background: "#f4f4f4", padding: "1rem" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}