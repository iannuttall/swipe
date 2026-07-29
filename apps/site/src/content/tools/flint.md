---
name: "Flint"
seoTitle: "Flint AI chart generator for editable charts"
headline: "Flint: Build editable charts for websites, reports, and Excel"
tagline: "Create one editable chart for websites, reports, dashboards, or Excel."
description: "Flint turns a compact semantic chart specification into native Vega-Lite, ECharts, Chart.js, Plotly, or editable Excel output for agents and apps."
icon: "/tools/icons/flint.png"
url: "https://microsoft.github.io/flint-chart/"
kind: "repository"
platforms: ["Web", "Node.js", "Microsoft Excel"]
repository: "https://github.com/microsoft/flint-chart"
category: "Data visualisation"
tags: ["charts", "data", "MCP"]
status: "early"
firstSeen: 2026-07-29
lastChecked: 2026-07-29
reviewEveryDays: 60
featuredIssues: ["sketch-an-app-with-ai"]
sources:
  - kind: "docs"
    label: "Flint documentation and editor"
    url: "https://microsoft.github.io/flint-chart/"
    checkedAt: 2026-07-29
  - kind: "repository"
    label: "Flint source code and README"
    url: "https://github.com/microsoft/flint-chart"
    checkedAt: 2026-07-29
  - kind: "release"
    label: "Flint v0.4.0"
    url: "https://github.com/microsoft/flint-chart/releases/tag/0.4.0"
    checkedAt: 2026-07-29
  - kind: "docs"
    label: "Flint MCP setup"
    url: "https://microsoft.github.io/flint-chart/#/mcp"
    checkedAt: 2026-07-29
  - kind: "other"
    label: "Open validation issue"
    url: "https://github.com/microsoft/flint-chart/issues/68"
    checkedAt: 2026-07-29
---

## What Flint changes

Most AI chart generators ask for a prompt, choose a chart, and return an image
or a configuration tied to one library. Flint keeps an editable description
of the chart between the prompt and the renderer.

That description contains the rows, the meaning of each field, and the visual
encoding. A field can be marked as `Price`, `Country`, `Temperature`, or one of
more than 70 other semantic types. Flint then chooses lower-level details such
as scales, labels, spacing, and colour treatment.

The same input can compile to Vega-Lite, ECharts, Chart.js, Plotly, or a native
Excel chart. This is useful when an analysis starts in an agent conversation
but the finished work must live in a website, a report, or an editable
spreadsheet.

## A practical first chart

Install the JavaScript package in a Node 18 or newer project:

```sh
pnpm add flint-chart
```

Create one chart input with your rows, semantic types, and chart choice. Then
call the assembler for the backend you need:

```ts
import { assembleECharts, assembleVegaLite } from "flint-chart";

const chart = {
  data: { values: salesRows },
  semantic_types: {
    month: "YearMonth",
    revenue: "Price",
    region: "Category",
  },
  chart_spec: {
    chartType: "Line Chart",
    encodings: {
      x: { field: "month" },
      y: { field: "revenue" },
      color: { field: "region" },
    },
    baseSize: { width: 640, height: 360 },
  },
};

const webSpec = assembleVegaLite(chart);
const dashboardSpec = assembleECharts(chart);
```

Keep the Flint input next to the data and review it in source control. If a
client later needs Excel or Plotly, switch the assembler instead of asking an
agent to recreate the chart from memory.

We compiled one five-row fixture with Flint 0.4.1 and got valid Vega-Lite and
ECharts output. The result confirms the basic cross-backend flow. It does not
confirm that every chart type looks identical across renderers.

## Use the MCP server with a narrow file boundary

Flint also ships an MCP server:

```sh
npx -y flint-chart-mcp
```

It gives compatible agents tools to validate, compile, render, and open charts
in an interactive view. The local server can return SVG or PNG output and
currently renders through Vega-Lite, ECharts, and Chart.js. Plotly and Excel
are available through the core library, but not every core backend is exposed
through every MCP rendering path.

By default the local MCP server can read JSON, CSV, and TSV files named in a
chart's `data.url`. An agent could therefore ask it to read a local file you
did not intend to chart. Disable that feature when you only need inline rows:

```sh
npx -y flint-chart-mcp --disable-file-reference
```

Use the local server for private data. Flint also documents a hosted MCP
endpoint, but rows sent to a remote endpoint leave your machine. The renderer
does not fetch arbitrary remote data URLs, which removes one route for silent
network access.

## Prepare the table before Flint sees it

Flint is a chart compiler, not a data-cleaning system. It does not join tables,
repair dates, group transactions, or decide which business metric is correct.
Prepare a chart-ready table first.

For a monthly revenue chart calculate the monthly totals in your own trusted
code or spreadsheet. Pass those finished rows to Flint. This separation makes
the agent's work easier to inspect: one step creates the data and another
decides how to show it.

If an agent proposes transformation code run that code only in a trusted or
sandboxed environment. Flint's own agent workflow documentation makes this
boundary explicit.

## Price, licence, and platform support

Flint is free and MIT licensed. The maintained package is JavaScript and
TypeScript for Node.js. A Python port exists in the repository as a preview,
but it is not yet a released Python package.

Version 0.4 added 38 Plotly chart types and 18 native Excel templates. The
Excel output uses Office.js so the result remains editable inside Excel rather
than becoming a pasted image.

## Current limits

Flint is moving quickly and validation is not yet strict enough to trust
without review. Our fixture included an unknown chart property and the
compiler accepted it. Open issue 68 reports the same silent validation gap.
There are also open issues around styling, layout, and chart accessibility.

Check the compiled result against the source rows, inspect axes and units, and
test keyboard and screen-reader behaviour if the chart is public. A successful
compile only proves that the renderer understood the specification.

## When to choose something else

Use Datawrapper, Flourish, or a spreadsheet when you want a hosted visual
editor and do not need a reusable specification. Use Vega-Lite, ECharts, or
Plotly directly when you need complete control over one renderer.

Flint fits when an agent helps author charts, people still need to edit the
intent, and the delivery backend may change.
