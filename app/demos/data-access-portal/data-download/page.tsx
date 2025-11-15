'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import type { GymDatasetSlug } from '@/types/data-access-portal';
import {
  DATASET_DISPLAY_ORDER,
  DATASET_LEVEL_LABELS,
  PRIMARY_DATASET_LEVEL,
} from '@/lib/gym-datasets';
import { PortalPageShell } from '../_components/page-shell';

type AllowedDataset = {
  slug: GymDatasetSlug;
  label: string;
  description?: string | null;
  level?: number | null;
};

type VisualizationPackagePayload = {
  id: string;
  presetId: string;
  title: string;
  description: string;
  chart: {
    type: 'bar' | 'line' | 'doughnut';
    xLabel: string;
    yLabel: string;
    series: Array<{ label: string; value: number; color: string; extra?: Record<string, any> }>;
  };
  data: Record<string, any>;
  status: 'ready';
};

type VisualizationDisplayOptions = {
  theme: 'dark' | 'light';
  showTitle: boolean;
  showDescription: boolean;
  showLegend: boolean;
  showXAxisLabel: boolean;
  showYAxisLabel: boolean;
};

type UnlockResponse = {
  request: {
    id: string;
    piName: string;
    projectTitle?: string | null;
    datasets: AllowedDataset[];
    visualizationPackages: VisualizationPackagePayload[];
    visualizationCustomRequest?: string | null;
    customDeliveryStatus?: 'pending' | 'fulfilled' | 'rejected' | null;
    customDeliveryNote?: string | null;
    palette?: string[] | null;
  };
};

const DATASET_SORT_RANK = Object.fromEntries(
  DATASET_DISPLAY_ORDER.map((slug, index) => [slug, index])
) as Record<GymDatasetSlug, number>;
const DEFAULT_PALETTE = ['#34d399', '#22d3ee', '#a855f7'];
const DATASET_FOLDER_LABELS: Partial<Record<GymDatasetSlug, string>> = {
  set_metrics: 'sets',
  workout_sessions: 'sessions',
  aggregates: 'aggregates',
  body_metrics: 'body-metrics',
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T/i;
const formatSeriesLabel = (label: unknown) => {
  if (label == null) return '';
  if (typeof label === 'number') return Number.isFinite(label) ? label.toLocaleString() : `${label}`;
  if (typeof label === 'string') {
    if (ISO_DATE_REGEX.test(label)) {
      const parsed = new Date(label);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return label.split('T')[0];
    }
    return label;
  }
  return String(label);
};

const MIN_PALETTE_COLORS = 2;
const MAX_PALETTE_COLORS = 5;

const baseFileName = (pkg: VisualizationPackagePayload) => {
  const source = pkg.title?.trim() || pkg.presetId || 'visualization';
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'visualization';
};

const sanitizePalette = (palette: string[] | null | undefined) =>
  (palette ?? [])
    .filter((color): color is string => typeof color === 'string')
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, MAX_PALETTE_COLORS);

export default function DataDownloadPage() {
  const [apiKey, setApiKey] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<UnlockResponse['request'] | null>(null);
  const [loadingDataset, setLoadingDataset] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [vizPalette, setVizPalette] = useState<string[]>(DEFAULT_PALETTE);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [visualDisplayOptions, setVisualDisplayOptions] = useState<VisualizationDisplayOptions>({
    theme: 'light',
    showTitle: true,
    showDescription: true,
    showLegend: true,
    showXAxisLabel: true,
    showYAxisLabel: true,
  });
  const hasVisualizationPackages =
    !!requestInfo &&
    ((requestInfo.visualizationPackages?.length ?? 0) > 0 ||
      !!requestInfo.visualizationCustomRequest);

  const sortedApprovedDatasets = requestInfo
    ? [...requestInfo.datasets].sort(
        (a, b) =>
          (DATASET_SORT_RANK[a.slug] ?? Number.MAX_SAFE_INTEGER) -
          (DATASET_SORT_RANK[b.slug] ?? Number.MAX_SAFE_INTEGER)
      )
    : [];
  const hasApprovedDatasets = sortedApprovedDatasets.length > 0;
  const showDatasetSection = !!requestInfo && hasApprovedDatasets;
  const showVisualizationSection = !!requestInfo && hasVisualizationPackages;
  const customDeliveryStatus =
    requestInfo?.customDeliveryStatus ??
    (requestInfo?.visualizationCustomRequest ? 'pending' : null);
  const customDeliveryNote = requestInfo?.customDeliveryNote ?? null;
  const visualizationPackagesWithPalette = useMemo(() => {
    if (!requestInfo?.visualizationPackages) return [];
    if (!vizPalette || vizPalette.length === 0) {
      return requestInfo.visualizationPackages;
    }
    return requestInfo.visualizationPackages.map((pkg) => {
      const nextSeries = pkg.chart.series.map((point, index) => ({
        ...point,
        color: vizPalette[index % vizPalette.length] ?? point.color,
      }));
      return {
        ...pkg,
        chart: { ...pkg.chart, series: nextSeries },
      };
    });
  }, [requestInfo?.visualizationPackages, vizPalette]);

  const formatDatasetScope = (dataset: AllowedDataset) => {
    const canonicalLevel =
      PRIMARY_DATASET_LEVEL[dataset.slug as keyof typeof PRIMARY_DATASET_LEVEL] ??
      dataset.level ??
      1;
    const rawLabel =
      DATASET_LEVEL_LABELS[dataset.slug as keyof typeof DATASET_LEVEL_LABELS] ?? '';
    const summary = rawLabel.includes('-')
      ? rawLabel
          .split('-')
          .slice(1)
          .join('-')
          .trim()
      : rawLabel.replace(/^Level\s*\d+\s*/i, '').trim();
    const suffix = summary || 'Dataset scope';
    return `Level ${canonicalLevel} - ${suffix}`;
  };

  const defaultOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://datawithdillon.com';
  const [siteOrigin, setSiteOrigin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : defaultOrigin
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!requestInfo) return;
    const nextPalette = sanitizePalette(requestInfo.palette ?? DEFAULT_PALETTE);
    if (nextPalette.length >= MIN_PALETTE_COLORS) {
      setVizPalette(nextPalette);
    } else {
      setVizPalette(DEFAULT_PALETTE);
    }
  }, [requestInfo]);

  const persistPalette = useCallback(
    async (palette: string[]) => {
      if (!requestInfo || !apiKey.trim()) return;
      try {
        await fetch('/api/data-access-portal/gym-data/palette', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey.trim(), palette }),
        });
      } catch (error) {
        console.error('Failed to save palette', error);
      }
    },
    [apiKey, requestInfo?.id]
  );

  useEffect(() => {
    if (!requestInfo) return;
    const timer = setTimeout(() => {
      persistPalette(vizPalette);
    }, 500);
    return () => clearTimeout(timer);
  }, [vizPalette, persistPalette, requestInfo]);

  const copyExampleToClipboard = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setDownloadMessage('Copied API example to clipboard.');
    } catch {
      setDownloadMessage('Unable to copy automatically. Please copy manually.');
    }
  };

  const fetchDatasetCsvBuffer = async (dataset: GymDatasetSlug) => {
    if (typeof window === 'undefined') {
      throw new Error('Bulk download is only available in the browser.');
    }
    if (!apiKey.trim()) {
      throw new Error('Enter the API key that was issued after approval.');
    }
    const url = new URL(window.location.origin + '/api/data-access-portal/gym-data');
    url.searchParams.set('dataset', dataset);
    url.searchParams.set('format', 'csv');
    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? `Failed to fetch ${dataset}`);
    }
    return res.arrayBuffer();
  };

  const updatePaletteColor = (index: number, color: string) => {
    setVizPalette((prev) => {
      const next = [...prev];
      next[index] = color;
      return next;
    });
  };

  const addPaletteColor = () => {
    setVizPalette((prev) => (prev.length >= MAX_PALETTE_COLORS ? prev : [...prev, '#22c55e']));
  };

  const removePaletteColor = (index: number) => {
    setVizPalette((prev) => {
      if (prev.length <= MIN_PALETTE_COLORS) return prev;
      const next = prev.filter((_, i) => i !== index);
      return next.length < MIN_PALETTE_COLORS ? prev : next;
    });
  };

  const handleUnlock = async () => {
    setUnlockError(null);
    setDownloadMessage(null);

    if (!apiKey.trim()) {
      setUnlockError('Enter the API key that was issued after approval.');
      return;
    }

    setUnlocking(true);
    try {
      const res = await fetch('/api/data-access-portal/gym-data/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to unlock datasets');
      const request = json.request as UnlockResponse['request'];
      setRequestInfo(request);
      const nextPalette = sanitizePalette(request.palette ?? DEFAULT_PALETTE);
      if (nextPalette.length >= MIN_PALETTE_COLORS) {
        setVizPalette(nextPalette);
      } else {
        setVizPalette(DEFAULT_PALETTE);
      }
    } catch (err: any) {
      setUnlockError(err.message ?? 'Could not unlock datasets with that key.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDatasetDownload = async (dataset: GymDatasetSlug) => {
    if (!requestInfo) return;
    setLoadingDataset(dataset);
    setDownloadMessage(null);

    try {
      const buffer = await fetchDatasetCsvBuffer(dataset);
      const blob = new Blob([buffer], { type: 'text/csv' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${dataset}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setDownloadMessage(`Downloaded ${dataset}.csv`);
    } catch (err: any) {
      setDownloadMessage(err.message ?? 'Failed to fetch dataset.');
    } finally {
      setLoadingDataset(null);
    }
  };

  const renderVisualizationPreview = async (
    pkg: VisualizationPackagePayload,
    overrides?: VisualizationDisplayOptions
  ): Promise<Blob | null> => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const options = overrides ?? visualDisplayOptions;
    const themeColors =
      options.theme === 'light'
        ? {
            background: '#fdfdfd',
            heading: '#0f172a',
            body: '#475569',
            border: '#d4d4d8',
            legendBorder: '#e2e8f0',
            donutCutout: '#f7f7fb',
            legendText: '#475569',
            grid: '#e4e4eb',
          }
        : {
            background: '#050506',
            heading: '#e9e9ff',
            body: '#b4b4cf',
            border: '#1c1c24',
            legendBorder: '#18181f',
            donutCutout: '#050506',
            legendText: '#b4b4cf',
            grid: '#171720',
          };

    ctx.fillStyle = themeColors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (options.showTitle && pkg.title) {
      ctx.fillStyle = themeColors.heading;
      ctx.font = '600 32px "Geist", sans-serif';
      ctx.fillText(pkg.title, canvas.width / 2, 70);
    }

    if (options.showDescription && pkg.description) {
      ctx.font = '14px "Geist", sans-serif';
      ctx.fillStyle = themeColors.body;
      ctx.fillText(pkg.description, canvas.width / 2, 100);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const chartPadding = { top: 140, right: 70, bottom: 140, left: 120 };
    const chartArea = {
      x: chartPadding.left,
      y: chartPadding.top,
      width: canvas.width - chartPadding.left - chartPadding.right,
      height: 320,
    };
    ctx.strokeStyle = themeColors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(chartArea.x, chartArea.y, chartArea.width, chartArea.height);

    const drawGridLines = (withVertical = false, lines = 5) => {
      ctx.save();
      ctx.strokeStyle = themeColors.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      for (let i = 1; i < lines; i += 1) {
        const y = chartArea.y + (chartArea.height / lines) * i;
        ctx.beginPath();
        ctx.moveTo(chartArea.x, y);
        ctx.lineTo(chartArea.x + chartArea.width, y);
        ctx.stroke();
      }
      if (withVertical) {
        const verticalLines = Math.min(series.length, 6);
        for (let i = 1; i < verticalLines; i += 1) {
          const x = chartArea.x + (chartArea.width / verticalLines) * i;
          ctx.beginPath();
          ctx.moveTo(x, chartArea.y);
          ctx.lineTo(x, chartArea.y + chartArea.height);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      ctx.restore();
    };

    const series = pkg.chart.series.slice(0, 12);
    const maxValue = Math.max(...series.map((point) => point.value), 1);
    const effectiveHeight = chartArea.height - 20;

    const drawYAxisTicks = (lines = 5) => {
      ctx.save();
      ctx.font = '12px "Geist", sans-serif';
      ctx.fillStyle = themeColors.body;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      let maxLabelWidth = 0;
      for (let i = 0; i <= lines; i += 1) {
        const value = (maxValue / lines) * i;
        const label = value.toLocaleString();
        const y = chartArea.y + chartArea.height - (value / maxValue) * effectiveHeight;
        const width = ctx.measureText(label).width;
        maxLabelWidth = Math.max(maxLabelWidth, width);
        ctx.fillText(label, chartArea.x - 8, y);
      }
      ctx.restore();
      return maxLabelWidth;
    };

    const isDoughnut = pkg.chart.type === 'doughnut';
    const allowLegend = options.showLegend && pkg.chart.type !== 'bar';
    const showXAxisLabel = allowLegend && options.showXAxisLabel && !isDoughnut;
    const showYAxisLabel = options.showYAxisLabel && !isDoughnut;
    let yTickWidth = 0;
    const barCenters: Array<{ x: number; label: string }> = [];
    const linePoints: Array<{ x: number; y: number; color: string }> = [];
    if (pkg.chart.type === 'line') {
      drawGridLines(true);
      yTickWidth = drawYAxisTicks();
      ctx.strokeStyle = options.theme === 'light' ? '#0f0f0f' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      series.forEach((point, index) => {
        const x =
          chartArea.x +
          (index / Math.max(series.length - 1, 1)) * chartArea.width;
        const y =
          chartArea.y +
          chartArea.height -
          (point.value / maxValue) * effectiveHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        linePoints.push({ x, y, color: point.color });
      });
      ctx.stroke();
      linePoints.forEach((point) => {
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (pkg.chart.type === 'doughnut') {
      const total = Math.max(
        1,
        series.reduce((sum, point) => sum + Math.max(point.value, 0), 0)
      );
      let startAngle = -Math.PI / 2;
      const centerX = chartArea.x + chartArea.width / 2;
      const centerY = chartArea.y + chartArea.height / 2;
      const radius = Math.min(chartArea.width, chartArea.height) / 3;

      series.forEach((point) => {
        const angle = (Math.max(point.value, 0) / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.fillStyle = point.color;
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
        ctx.closePath();
        ctx.fill();
        startAngle += angle;
      });
      ctx.fillStyle = themeColors.donutCutout;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (pkg.chart.type === 'bar') {
      drawGridLines();
      yTickWidth = drawYAxisTicks();
      const barWidth = chartArea.width / Math.max(series.length, 1) - 12;
      series.forEach((point, index) => {
        const x = chartArea.x + index * (barWidth + 12);
        const height =
          (Math.max(point.value, 0) / maxValue) * effectiveHeight;
        const y = chartArea.y + chartArea.height - height;
        ctx.fillStyle = point.color;
        ctx.fillRect(x, y, barWidth, height);
        barCenters.push({
          x: x + barWidth / 2,
          label: formatSeriesLabel(point.label),
        });
      });
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (showXAxisLabel && pkg.chart.xLabel) {
      ctx.font = '14px "Geist", sans-serif';
      ctx.fillStyle = themeColors.body;
      ctx.fillText(pkg.chart.xLabel, chartArea.x + chartArea.width / 2, chartArea.y + chartArea.height + 50);
    }
    ctx.textBaseline = 'alphabetic';

    if (showYAxisLabel && pkg.chart.yLabel) {
      ctx.save();
      const labelOffset = (yTickWidth || 0) + 35;
      ctx.translate(chartArea.x - labelOffset, chartArea.y + chartArea.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = '14px "Geist", sans-serif';
      ctx.fillStyle = themeColors.body;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pkg.chart.yLabel, 0, 0);
      ctx.restore();
    }

    if (pkg.chart.type === 'bar' && barCenters.length > 0) {
      ctx.textBaseline = 'top';
      ctx.font = '13px "Geist", sans-serif';
      ctx.fillStyle = themeColors.body;
      barCenters.forEach((entry) => {
        ctx.fillText(entry.label, entry.x, chartArea.y + chartArea.height + 15);
      });
      ctx.textBaseline = 'alphabetic';
    }

    ctx.textAlign = 'left';

    if (allowLegend) {
      const legendItems = series.slice(0, 8);
      ctx.font = '13px "Geist", sans-serif';
      const entries = legendItems.map((point) => {
        const label = formatSeriesLabel(point.label);
        const textWidth = ctx.measureText(label).width;
        return {
          point,
          label,
          entryWidth: textWidth + 44,
        };
      });
      const rows: { items: typeof entries; width: number }[] = [];
      let current: typeof entries = [];
      let currentWidth = 0;
      const maxWidth = chartArea.width;
      entries.forEach((entry, idx) => {
        const widthWithGap = entry.entryWidth + (current.length > 0 ? 24 : 0);
        if (current.length > 0 && currentWidth + widthWithGap > maxWidth) {
          rows.push({ items: current, width: currentWidth });
          current = [entry];
          currentWidth = entry.entryWidth;
        } else {
          current.push(entry);
          currentWidth += widthWithGap;
        }
      });
      if (current.length > 0) {
        rows.push({ items: current, width: currentWidth });
      }
      const rowHeight = 26;
      const legendStartY = chartArea.y + chartArea.height + 70;
      rows.forEach((row, rowIndex) => {
        const rowStartX = chartArea.x + (chartArea.width - row.width) / 2;
        let cursorX = rowStartX;
        row.items.forEach((entry, entryIndex) => {
          if (entryIndex > 0) cursorX += 24;
          const cursorY = legendStartY + rowIndex * rowHeight;
          ctx.fillStyle = entry.point.color;
          ctx.fillRect(cursorX, cursorY - 8, 18, 18);
          ctx.strokeStyle = themeColors.legendBorder;
          ctx.strokeRect(cursorX, cursorY - 8, 18, 18);
          ctx.fillStyle = themeColors.legendText;
          ctx.fillText(entry.label, cursorX + 26, cursorY + 1);
          cursorX += entry.entryWidth;
        });
      });
    }

    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    );
  };

  const handleVisualizationDownload = async (pkg: VisualizationPackagePayload) => {
    try {
      const zip = new JSZip();
      const visualizationFolder = zip.folder(pkg.presetId) ?? zip;
      const fileBase = baseFileName(pkg);
      visualizationFolder.file(
        `${fileBase}-data.json`,
        JSON.stringify(pkg, null, 2),
        { binary: false }
      );
      const previewBlob = await renderVisualizationPreview(pkg, visualDisplayOptions);
      if (previewBlob) {
        const previewBuffer = await previewBlob.arrayBuffer();
        visualizationFolder.file(`${fileBase}-visual.png`, previewBuffer);
      }
      const archive = await zip.generateAsync({ type: 'blob' });
      const href = URL.createObjectURL(archive);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${fileBase}-bundle.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setDownloadMessage(`Downloaded visualization package "${pkg.title}".`);
    } catch (err: any) {
      setDownloadMessage(err.message ?? 'Failed to download visualization package.');
    }
  };

  const handleDownloadAll = async () => {
    if (!requestInfo) return;
    if (!apiKey.trim()) {
      setDownloadMessage('Unlock datasets first to download everything.');
      return;
    }
    const hasDatasets = sortedApprovedDatasets.length > 0;
    const hasVisuals = visualizationPackagesWithPalette.length > 0;
    if (!hasDatasets && !hasVisuals) {
      setDownloadMessage('No datasets or visualization bundles are available to download yet.');
      return;
    }
    setBulkDownloading(true);
    setDownloadMessage(null);
    try {
      const zip = new JSZip();
      const root = zip;

      for (let i = 0; i < sortedApprovedDatasets.length; i += 1) {
        const dataset = sortedApprovedDatasets[i];
        const slug = dataset.slug as GymDatasetSlug;
        const buffer = await fetchDatasetCsvBuffer(slug);
        const folderLabel =
          DATASET_FOLDER_LABELS[slug] ??
          dataset.label?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
          slug;
        const folderName = `${String(i + 1)}_${folderLabel}`;
        const folder = root.folder(folderName) ?? root;
        folder.file(`${slug}.csv`, buffer);
      }

      for (const pkg of visualizationPackagesWithPalette) {
        const folder = root.folder(pkg.presetId) ?? root;
        const previewBlob = await renderVisualizationPreview(pkg, visualDisplayOptions);
        const fileBase = baseFileName(pkg);
        folder.file(`${fileBase}-data.json`, JSON.stringify(pkg, null, 2), {
          binary: false,
        });
        if (previewBlob) {
          const previewBuffer = await previewBlob.arrayBuffer();
          folder.file(`${fileBase}-visual.png`, previewBuffer);
        }
      }

      const archive = await zip.generateAsync({ type: 'blob' });
      const today = new Date().toISOString().split('T')[0];
      const href = URL.createObjectURL(archive);
      const a = document.createElement('a');
      a.href = href;
      a.download = `dillons-gym-data-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setDownloadMessage('Downloaded everything in a single zip.');
    } catch (err: any) {
      setDownloadMessage(err.message ?? 'Failed to download everything.');
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <PortalPageShell
      eyebrow="Demo - Data Download"
      title="Download Approved Gym Data"
      description="Enter an API key issued from the admin view. I’ll unlock the datasets and all-time visualization bundles tied to that approval so you can preview JSON payloads or export CSV instantly."
      actions={
        <Link
          href="/demos/data-access-portal"
          className="inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/60 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-emerald-500/70 hover:text-emerald-200"
        >
          Back to portal
        </Link>
      }
    >
      <>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-6 shadow-sm shadow-black/40 sm:p-8">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-300">API Key</label>
                <input
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs font-mono outline-none focus:border-emerald-500/70"
                  placeholder="dar_xxx..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-[11px] text-zinc-500">
                  Paste the key you copied from the admin approval screen.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={unlocking || !apiKey.trim()}
                  onClick={handleUnlock}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-zinc-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
                >
                  {unlocking ? 'Unlocking...' : 'Unlock datasets'}
                </button>
                {requestInfo && (
                  <button
                    type="button"
                    onClick={handleDownloadAll}
                    disabled={bulkDownloading}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 px-4 py-2 text-xs font-medium text-sky-200 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
                  >
                    {bulkDownloading ? 'Preparing...' : 'Download all'}
                  </button>
                )}
              </div>
              {unlockError && <p className="text-[11px] text-red-400">{unlockError}</p>}
              {requestInfo && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100">
                  <p>
                    <span className="font-medium text-emerald-300">Requester:</span>{' '}
                    {requestInfo.piName}
                  </p>
                  <p>
                    <span className="font-medium text-emerald-300">Project:</span>{' '}
                    {requestInfo.projectTitle || 'Untitled'}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-[11px] text-zinc-300">
              <p className="text-[11px] font-medium text-zinc-200">Reminder</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-zinc-400">
                <li>Keys are tied to a single request. Rotating decisions invalidates old keys.</li>
                <li>I only surface datasets and visuals your approval actually covers.</li>
                <li>Preview JSON inline or download CSV/visual bundles for quick analysis.</li>
                <li>Palette selections persist with each API key, so whatever you pick stays with that approval.</li>
              </ul>
            </div>
          </div>

          {requestInfo && (
            <div className="mt-6 space-y-8">
              {showVisualizationSection && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Visualization packages (aggregated)
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    These are pre-rendered aggregates only. Underlying rows stay in the secure
                    room; download the packaged visuals or clone the spec to tailor filters and
                    palette.
                  </p>
                  <div className="rounded-2xl border border-zinc-900/70 bg-black/30 p-4 text-[11px] text-zinc-400">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                      Visualization display controls
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase text-zinc-500">Theme</p>
                        <div className="flex flex-wrap gap-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border border-zinc-600 bg-transparent"
                              checked={visualDisplayOptions.theme === 'light'}
                              onChange={() =>
                                setVisualDisplayOptions((prev) => ({ ...prev, theme: 'light' }))
                              }
                            />
                            <span>Light mode</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border border-zinc-600 bg-transparent"
                              checked={visualDisplayOptions.theme === 'dark'}
                              onChange={() =>
                                setVisualDisplayOptions((prev) => ({ ...prev, theme: 'dark' }))
                              }
                            />
                            <span>Dark mode</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase text-zinc-500">Optional elements</p>
                        <div className="flex flex-wrap gap-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border border-zinc-600 bg-transparent"
                              checked={visualDisplayOptions.showTitle}
                              onChange={(e) =>
                                setVisualDisplayOptions((prev) => ({
                                  ...prev,
                                  showTitle: e.target.checked,
                                }))
                              }
                            />
                            <span>Title</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border border-zinc-600 bg-transparent"
                              checked={visualDisplayOptions.showDescription}
                              onChange={(e) =>
                                setVisualDisplayOptions((prev) => ({
                                  ...prev,
                                  showDescription: e.target.checked,
                                }))
                              }
                            />
                            <span>Description</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border border-zinc-600 bg-transparent"
                              checked={visualDisplayOptions.showLegend}
                              onChange={(e) =>
                                setVisualDisplayOptions((prev) => ({
                                  ...prev,
                                  showLegend: e.target.checked,
                                }))
                              }
                            />
                            <span>Legend</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border border-zinc-600 bg-transparent"
                              checked={visualDisplayOptions.showXAxisLabel}
                              onChange={(e) =>
                                setVisualDisplayOptions((prev) => ({
                                  ...prev,
                                  showXAxisLabel: e.target.checked,
                                }))
                              }
                            />
                            <span>X-axis label</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border border-zinc-600 bg-transparent"
                              checked={visualDisplayOptions.showYAxisLabel}
                              onChange={(e) =>
                                setVisualDisplayOptions((prev) => ({
                                  ...prev,
                                  showYAxisLabel: e.target.checked,
                                }))
                              }
                            />
                            <span>Y-axis label</span>
                          </label>
                        </div>
                      </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase text-zinc-500">Palette</p>
                        <button
                          type="button"
                          onClick={addPaletteColor}
                          disabled={vizPalette.length >= MAX_PALETTE_COLORS}
                          className="rounded-full border border-emerald-500/40 px-3 py-1 text-[11px] text-emerald-300 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
                        >
                          + Add color
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {vizPalette.map((color, index) => (
                          <div
                            key={`${color}-${index}`}
                            className="flex h-full items-center justify-between gap-3 rounded-2xl border border-zinc-900/80 bg-zinc-950/70 px-4 py-3 shadow-inner shadow-black/40"
                          >
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => updatePaletteColor(index, e.target.value)}
                              title={`Select palette color ${index + 1}`}
                              className="h-12 w-full flex-1 cursor-pointer appearance-none rounded-xl border border-zinc-700 bg-transparent p-0"
                              style={{ background: color }}
                            />
                            <button
                              type="button"
                              onClick={() => removePaletteColor(index)}
                              disabled={vizPalette.length <= MIN_PALETTE_COLORS}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-[14px] text-zinc-300 transition hover:border-red-500/60 hover:text-red-300 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
                              aria-label={`Remove palette color ${index + 1}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Keep between {MIN_PALETTE_COLORS} and {MAX_PALETTE_COLORS} colors. Remove extras to simplify the chart palette.
                      </p>
                    </div>
                  </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {visualizationPackagesWithPalette.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-zinc-50">
                            {pkg.title || 'Untitled visualization'}
                          </h4>
                          <span className="text-[10px] uppercase text-emerald-300">
                            {pkg.chart.type} • ready
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {pkg.description || 'No description provided.'}
                        </p>
                        <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3 text-[10px] text-zinc-400">
                          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                            Series sample
                          </p>
                          <div className="mt-2 space-y-1">
                            {pkg.chart.series.slice(0, 3).map((point) => (
                              <div key={point.label} className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: point.color }}
                                  />
                                  {formatSeriesLabel(point.label)}
                                </span>
                                <span className="font-semibold text-zinc-200">
                                  {point.value.toLocaleString()}
                                </span>
                              </div>
                            ))}
                            {pkg.chart.series.length > 3 && (
                              <p className="text-[9px] text-zinc-500">
                                +{pkg.chart.series.length - 3} more data points
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVisualizationDownload(pkg)}
                          className="mt-auto rounded-full border border-emerald-500/60 px-3 py-1.5 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-500/10"
                        >
                          Download bundle
                        </button>
                      </div>
                    ))}
                    {requestInfo.visualizationCustomRequest && (
                      <div className="flex flex-col gap-2 rounded-2xl border border-sky-500/50 bg-sky-500/5 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-zinc-50">Custom ask</h4>
                          <span
                            className={`rounded-full border px-2 py-[2px] text-[10px] font-medium ${
                              customDeliveryStatus === 'fulfilled'
                                ? 'border-emerald-500/60 text-emerald-200'
                                : customDeliveryStatus === 'rejected'
                                  ? 'border-red-500/60 text-red-200'
                                  : 'border-yellow-500/50 text-yellow-200'
                            }`}
                          >
                            {customDeliveryStatus === 'fulfilled'
                              ? 'Fulfilled'
                              : customDeliveryStatus === 'rejected'
                                ? 'Rejected'
                                : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300">
                          {requestInfo.visualizationCustomRequest}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {customDeliveryStatus === 'fulfilled'
                            ? 'Delivered via email—check your inbox for the ZIP attachment.'
                            : customDeliveryStatus === 'rejected'
                              ? 'This custom package was declined. See the note below for details.'
                              : 'I deliver custom visualization bundles via email in 3-5 business days after approval.'}
                        </p>
                        {customDeliveryStatus === 'rejected' && customDeliveryNote && (
                          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] text-red-100">
                            {customDeliveryNote}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                          Palette:
                          {vizPalette.slice(0, 4).map((color) => (
                            <span
                              key={color}
                              className="h-4 w-4 rounded-full border border-zinc-800"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {showDatasetSection && (
                <div className="space-y-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Approved datasets
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Each card shows the Level 1, 2, or 3 scope tied to this API key. Copy the
                    ready-made API call or download CSV.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {sortedApprovedDatasets.map((dataset) => {
                      const loadingCsv = loadingDataset === dataset.slug;
                      const scopeLabel = formatDatasetScope(dataset);
                      const apiUrl = `/api/data-access-portal/gym-data?dataset=${dataset.slug}`;
                      const exampleUrl = `${siteOrigin}${apiUrl}${
                        apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''
                      }`;
                      return (
                        <div
                          key={dataset.slug}
                          className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold text-zinc-50">{dataset.label}</h3>
                              <span className="text-[10px] uppercase text-emerald-300">
                                {scopeLabel}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              {dataset.description || 'Approved slice of the gym dataset.'}
                            </p>
                            <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                                  API example
                                </p>
                                <button
                                  type="button"
                                  onClick={() => copyExampleToClipboard(exampleUrl)}
                                  className="text-[10px] text-emerald-300"
                                >
                                  Copy
                                </button>
                              </div>
                              <div className="mt-2 overflow-x-auto whitespace-nowrap rounded-lg bg-black/40 px-3 py-2 font-mono text-[11px] text-emerald-100">
                                GET{' '}
                                <a
                                  href={exampleUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-300 underline"
                                >
                                  {exampleUrl}
                                </a>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDatasetDownload(dataset.slug)}
                            disabled={loadingCsv}
                            className="mt-4 rounded-full border border-emerald-500/60 px-3 py-1.5 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingCsv ? 'Preparing...' : 'Download CSV'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!showDatasetSection && !showVisualizationSection && (
                <p className="text-xs text-zinc-500">
                  This approval does not include datasets or visualization packages yet.
                </p>
              )}
            </div>
          )}

          {downloadMessage && (
            <p className="mt-4 text-[11px] text-zinc-400">{downloadMessage}</p>
          )}
        </div>
      </>
    </PortalPageShell>
  );
}
