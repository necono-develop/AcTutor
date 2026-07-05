import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { Problem } from "../models/problem";
import { getSettings } from "../models/settings";

export type ProblemStatementDocument = {
  title: string;
  markdown: string;
};

export class ProblemStatementService {
  async fetchStatement(problem: Problem): Promise<ProblemStatementDocument> {
    const response = await fetch(problem.url, {
      headers: {
        "user-agent": "AcTutor VS Code extension"
      }
    });

    if (!response.ok) {
      throw new Error(`problem page fetch failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const title = extractTitle($, problem);
    const statement = selectStatement($, getSettings().statementLanguage);
    const body = renderChildren($, statement).trim();

    if (!body) {
      throw new Error("problem statement was not found in the AtCoder page");
    }

    return {
      title,
      markdown: `# ${title}\n\n- URL: ${problem.url}\n- Contest: ${problem.contestId}\n- Problem ID: ${problem.problemId}\n\n${body}\n`
    };
  }

  async fetchMarkdown(problem: Problem): Promise<string> {
    return (await this.fetchStatement(problem)).markdown;
  }
}

function extractTitle($: cheerio.CheerioAPI, problem: Problem): string {
  const pageTitle = $("title").first().text().trim();
  const normalized = pageTitle.replace(/\s*-\s*AtCoder\s*$/i, "").trim();
  return normalized || problem.title || problem.problemId;
}

function selectStatement($: cheerio.CheerioAPI, preferredLanguage: "ja" | "en" | "auto"): cheerio.Cheerio<Element> {
  const task = $("#task-statement");
  const japanese = task.find(".lang-ja").first();
  const english = task.find(".lang-en").first();

  if (preferredLanguage === "ja" && japanese.length > 0) {
    return japanese;
  }

  if (preferredLanguage === "en" && english.length > 0) {
    return english;
  }

  if (japanese.length > 0) {
    return japanese;
  }
  if (english.length > 0) {
    return english;
  }
  return task;
}

function renderChildren($: cheerio.CheerioAPI, node: cheerio.Cheerio<Element>): string {
  return node
    .contents()
    .toArray()
    .map((child) => renderNode($, child, 0))
    .join("")
    .replace(/\n{3,}/g, "\n\n");
}

function renderNode($: cheerio.CheerioAPI, node: AnyNode, listDepth: number): string {
  if (node.type === "text") {
    const text = normalizeInline($(node).text());
    return text.trim() ? text : "";
  }

  if (node.type !== "tag") {
    return "";
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  const children = () => $(element)
    .contents()
    .toArray()
    .map((child) => renderNode($, child, listDepth))
    .join("");

  switch (tagName) {
    case "h1":
      return `# ${children().trim()}\n\n`;
    case "h2":
      return `## ${children().trim()}\n\n`;
    case "h3":
      return `## ${children().trim()}\n\n`;
    case "h4":
      return `### ${children().trim()}\n\n`;
    case "p":
      return `${children().trim()}\n\n`;
    case "br":
      return "\n";
    case "pre":
      return `\`\`\`text\n${$(element).text().replace(/\s+$/g, "")}\n\`\`\`\n\n`;
    case "code":
      return `\`${$(element).text().trim()}\``;
    case "var":
    case "span":
    case "strong":
    case "b":
    case "em":
    case "i":
    case "a":
      return children();
    case "ul":
      return `${renderList($, element, false, listDepth)}\n`;
    case "ol":
      return `${renderList($, element, true, listDepth)}\n`;
    case "table":
      return renderTable($, element);
    case "div":
    case "section":
      return `${children()}\n`;
    default:
      return children();
  }
}

function renderList($: cheerio.CheerioAPI, element: Element, ordered: boolean, listDepth: number): string {
  return $(element)
    .children("li")
    .toArray()
    .map((li, index) => {
      const prefix = ordered ? `${index + 1}. ` : "- ";
      const indent = "  ".repeat(listDepth);
      const content = $(li)
        .contents()
        .toArray()
        .map((child) => renderNode($, child, listDepth + 1))
        .join("")
        .trim()
        .replace(/\n/g, `\n${indent}  `);
      return `${indent}${prefix}${content}`;
    })
    .join("\n");
}

function renderTable($: cheerio.CheerioAPI, element: Element): string {
  const rows = $(element)
    .find("tr")
    .toArray()
    .map((tr) => $(tr)
      .children("th,td")
      .toArray()
      .map((cell) => normalizeInline($(cell).text()).trim()));

  if (rows.length === 0) {
    return "";
  }

  const header = rows[0];
  const separator = header.map(() => "---");
  const body = rows.slice(1);
  return [
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n") + "\n\n";
}

function normalizeInline(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/[ \t\r\n]+/g, " ");
}
