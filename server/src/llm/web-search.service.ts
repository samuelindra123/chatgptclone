import { Injectable, Logger } from '@nestjs/common';

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(normalizedQuery)}`,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed with status ${response.status}`);
    }

    const html = await response.text();
    const results = this.parseHtmlResults(html, maxResults);

    if (results.length === 0) {
      this.logger.warn(`DuckDuckGo returned no parsable results for query: ${normalizedQuery}`);
    }

    return results;
  }

  private parseHtmlResults(html: string, maxResults: number): WebSearchResult[] {
    const results: WebSearchResult[] = [];
    const anchorPattern =
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gim;

    for (const match of html.matchAll(anchorPattern)) {
      if (results.length >= maxResults) {
        break;
      }

      const rawUrl = match[1];
      const title = this.cleanText(match[2]);
      const segment = html.slice(match.index ?? 0, (match.index ?? 0) + 2500);
      const snippetMatch = segment.match(
        /<(?:a|div)[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/im,
      );
      const snippet = this.cleanText(snippetMatch?.[1] ?? '');
      const url = this.normalizeDuckDuckGoUrl(rawUrl);

      if (!title || !url) {
        continue;
      }

      results.push({
        title,
        url,
        snippet,
      });
    }

    return results;
  }

  private normalizeDuckDuckGoUrl(rawUrl: string) {
    const decodedUrl = this.decodeHtmlEntities(rawUrl);

    if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://')) {
      return decodedUrl;
    }

    if (decodedUrl.startsWith('/')) {
      try {
        const duckUrl = new URL(`https://duckduckgo.com${decodedUrl}`);
        const redirected = duckUrl.searchParams.get('uddg');

        return redirected ? decodeURIComponent(redirected) : duckUrl.toString();
      } catch {
        return '';
      }
    }

    return decodedUrl;
  }

  private cleanText(value: string) {
    return this.decodeHtmlEntities(value)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private decodeHtmlEntities(value: string) {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      )
      .replace(/&#(\d+);/g, (_, decimal: string) =>
        String.fromCodePoint(Number.parseInt(decimal, 10)),
      );
  }
}
