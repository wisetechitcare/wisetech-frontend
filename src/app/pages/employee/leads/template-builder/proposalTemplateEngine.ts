import {
  allPlaceholders,
  placeholderKeyMap,
  placeholderKeys,
  placeholderMap,
  placeholderTokens,
  sampleValues,
} from './proposalPlaceholderData';

export type ValidationSeverity = 'critical' | 'warning' | 'info';

export type ValidationIssueType =
  | 'missing_braces'
  | 'double_braces'
  | 'camel_case'
  | 'missing_spaces'
  | 'wrong_underscores'
  | 'invalid_characters'
  | 'unsupported_placeholder'
  | 'duplicate_placeholder'
  | 'unbalanced_braces';

export type ValidationIssue = {
  id: string;
  type: ValidationIssueType;
  severity: ValidationSeverity;
  token: string;
  message: string;
  suggestion?: string;
  index?: number;
};

export type TemplateValidationReport = {
  totalRegisteredPlaceholders: number;
  totalSections: number;
  totalCandidates: number;
  validPlaceholders: string[];
  invalidPlaceholders: ValidationIssue[];
  duplicatePlaceholders: ValidationIssue[];
  unsupportedPlaceholders: ValidationIssue[];
  missingPlaceholders: string[];
  exactMatchCount: number;
  healthPercentage: number;
  parsingSuccessRate: number;
  exportReady: boolean;
  docxSafe: boolean;
  pdfSafe: boolean;
  revisionCompatible: boolean;
  statusLabel: 'Ready' | 'Review Needed' | 'Blocked';
};

export type HighlightSegment = {
  value: string;
  status: 'text' | 'valid' | 'invalid' | 'duplicate' | 'unsupported';
  message?: string;
};

const exactPlaceholderRegex = /\{ [a-z0-9]+(?:_[a-z0-9]+)* \}/g;
const bracedCandidateRegex = /\{\{[^{}]*\}\}|\{[^{}]*\}/g;
const validNameRegex = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const supportedTokens = new Set(placeholderTokens);
const supportedKeys = new Set(placeholderKeys);

const createIssue = (
  type: ValidationIssueType,
  severity: ValidationSeverity,
  token: string,
  message: string,
  suggestion?: string,
  index?: number
): ValidationIssue => ({
  id: `${type}-${token}-${index ?? 0}-${message}`,
  type,
  severity,
  token,
  message,
  suggestion,
  index,
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getTokenSuggestion = (rawToken: string) => {
  const normalized = rawToken
    .replace(/^\{\{/, '')
    .replace(/\}\}$/, '')
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .trim()
    .replace(/-/g, '_')
    .replace(/\./g, '_')
    .replace(/\s+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();

  if (supportedKeys.has(normalized)) {
    return `{ ${normalized} }`;
  }

  const closeMatch = placeholderKeys.find((key) => normalized.includes(key) || key.includes(normalized));
  return closeMatch ? `{ ${closeMatch} }` : undefined;
};

const hasBalancedBraces = (value: string) => {
  const opening = (value.match(/\{/g) || []).length;
  const closing = (value.match(/\}/g) || []).length;
  return opening === closing;
};

const detectBracedIssues = (template: string) => {
  const issues: ValidationIssue[] = [];
  const bracedMatches = Array.from(template.matchAll(bracedCandidateRegex));

  bracedMatches.forEach((match) => {
    const token = match[0];
    const index = match.index;

    if (token.startsWith('{{') || token.endsWith('}}')) {
      issues.push(
        createIssue(
          'double_braces',
          'critical',
          token,
          'Double braces are not supported. Use the single-brace proposal syntax.',
          getTokenSuggestion(token),
          index
        )
      );
      return;
    }

    if (supportedTokens.has(token)) {
      return;
    }

    const hasExpectedSpacing = /^\{ .+ \}$/.test(token);
    const inner = token.slice(1, -1);
    const trimmed = inner.trim();
    const suggestion = getTokenSuggestion(token);

    if (!hasExpectedSpacing) {
      issues.push(
        createIssue(
          'missing_spaces',
          'critical',
          token,
          'Internal spacing is invalid. Placeholders must be written with one space after { and one space before }.',
          suggestion,
          index
        )
      );
    }

    if (/[A-Z]/.test(trimmed)) {
      issues.push(
        createIssue(
          'camel_case',
          'critical',
          token,
          'Placeholder names must be lowercase snake_case.',
          suggestion,
          index
        )
      );
    }

    if (/[-.]/.test(trimmed) || /__/.test(trimmed)) {
      issues.push(
        createIssue(
          'wrong_underscores',
          'critical',
          token,
          'Use underscores between words. Hyphens, dots, and repeated underscores are not valid.',
          suggestion,
          index
        )
      );
    }

    if (!/^[a-zA-Z0-9_\s.-]+$/.test(trimmed)) {
      issues.push(
        createIssue(
          'invalid_characters',
          'critical',
          token,
          'The placeholder contains invalid characters.',
          suggestion,
          index
        )
      );
    }

    if (hasExpectedSpacing && validNameRegex.test(trimmed) && !supportedKeys.has(trimmed)) {
      issues.push(
        createIssue(
          'unsupported_placeholder',
          'critical',
          token,
          'This placeholder is syntactically valid but is not registered in the proposal placeholder library.',
          suggestion,
          index
        )
      );
    }
  });

  if (!hasBalancedBraces(template)) {
    issues.push(
      createIssue(
        'unbalanced_braces',
        'critical',
        'template',
        'The template has unbalanced curly braces.',
        'Check every placeholder has one opening and one closing brace.'
      )
    );
  }

  return issues;
};

const detectMissingBraceIssues = (template: string) => {
  const masked = template.replace(bracedCandidateRegex, ' ');
  const issues: ValidationIssue[] = [];

  placeholderKeys.forEach((key) => {
    const bareKeyRegex = new RegExp(`(^|[^A-Za-z0-9_{])(${escapeRegExp(key)})(?=$|[^A-Za-z0-9_}])`, 'g');
    const matches = Array.from(masked.matchAll(bareKeyRegex));
    matches.forEach((match) => {
      issues.push(
        createIssue(
          'missing_braces',
          'critical',
          key,
          'Known placeholder key found without curly braces.',
          `{ ${key} }`,
          match.index
        )
      );
    });
  });

  return issues;
};

const getExactTokenCounts = (template: string) => {
  const counts = new Map<string, number>();
  const exactMatches = Array.from(template.matchAll(exactPlaceholderRegex)).map((match) => match[0]);

  exactMatches.forEach((token) => {
    if (supportedTokens.has(token)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  });

  return counts;
};

export const validateTemplate = (template: string, totalSections: number): TemplateValidationReport => {
  const tokenCounts = getExactTokenCounts(template);
  const validPlaceholders = Array.from(tokenCounts.keys());
  const bracedIssues = detectBracedIssues(template);
  const missingBraceIssues = detectMissingBraceIssues(template);
  const duplicatePlaceholders = Array.from(tokenCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([token, count]) =>
      createIssue(
        'duplicate_placeholder',
        'warning',
        token,
        `This placeholder appears ${count} times. Duplicates are allowed only when intentional.`,
        undefined
      )
    );

  const invalidPlaceholders = [...bracedIssues, ...missingBraceIssues];
  const unsupportedPlaceholders = invalidPlaceholders.filter((issue) => issue.type === 'unsupported_placeholder');
  const missingPlaceholders = placeholderTokens.filter((token) => !tokenCounts.has(token));
  const criticalCount = invalidPlaceholders.filter((issue) => issue.severity === 'critical').length;
  const totalCandidates = Array.from(template.matchAll(bracedCandidateRegex)).length + missingBraceIssues.length;
  const exactMatchCount = validPlaceholders.length;
  const parsingSuccessRate = totalCandidates === 0 ? 100 : Math.round((exactMatchCount / totalCandidates) * 100);
  const lineOverflowRisk = template.split('\n').some((line) => line.length > 160);
  const healthPenalty =
    criticalCount * 9 +
    unsupportedPlaceholders.length * 6 +
    duplicatePlaceholders.length * 2 +
    Math.min(missingPlaceholders.length * 0.15, 12) +
    (lineOverflowRisk ? 5 : 0);
  const healthPercentage = clamp(Math.round(100 - healthPenalty), 0, 100);
  const exportReady = criticalCount === 0;
  const docxSafe = exportReady && !template.includes('{{') && hasBalancedBraces(template);
  const pdfSafe = exportReady && !lineOverflowRisk;
  const revisionCompatible = exportReady && duplicatePlaceholders.length <= 3;
  const statusLabel = exportReady ? (healthPercentage >= 90 ? 'Ready' : 'Review Needed') : 'Blocked';

  return {
    totalRegisteredPlaceholders: allPlaceholders.length,
    totalSections,
    totalCandidates,
    validPlaceholders,
    invalidPlaceholders,
    duplicatePlaceholders,
    unsupportedPlaceholders,
    missingPlaceholders,
    exactMatchCount,
    healthPercentage,
    parsingSuccessRate,
    exportReady,
    docxSafe,
    pdfSafe,
    revisionCompatible,
    statusLabel,
  };
};

export const renderTemplatePreview = (template: string, values: Record<string, string> = sampleValues) =>
  template.replace(exactPlaceholderRegex, (token) => {
    const placeholder = placeholderMap.get(token);
    if (!placeholder) return token;
    return values[placeholder.key] ?? values[token] ?? `[${placeholder.key}]`;
  });

export const getHighlightedSegments = (template: string): HighlightSegment[] => {
  const report = validateTemplate(template, 0);
  const duplicateTokens = new Set(report.duplicatePlaceholders.map((issue) => issue.token));
  const unsupportedTokens = new Set(report.unsupportedPlaceholders.map((issue) => issue.token));
  const invalidTokens = new Set(report.invalidPlaceholders.map((issue) => issue.token));
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;

  Array.from(template.matchAll(bracedCandidateRegex)).forEach((match) => {
    const token = match[0];
    const index = match.index || 0;
    if (index > lastIndex) {
      segments.push({ value: template.slice(lastIndex, index), status: 'text' });
    }

    if (supportedTokens.has(token)) {
      segments.push({
        value: token,
        status: duplicateTokens.has(token) ? 'duplicate' : 'valid',
        message: duplicateTokens.has(token) ? 'Duplicate placeholder' : 'Valid placeholder',
      });
    } else if (unsupportedTokens.has(token)) {
      segments.push({ value: token, status: 'unsupported', message: 'Unsupported placeholder' });
    } else if (invalidTokens.has(token)) {
      segments.push({ value: token, status: 'invalid', message: 'Invalid syntax' });
    } else {
      segments.push({ value: token, status: 'invalid', message: 'Invalid placeholder' });
    }

    lastIndex = index + token.length;
  });

  if (lastIndex < template.length) {
    segments.push({ value: template.slice(lastIndex), status: 'text' });
  }

  return segments;
};

export const buildDocumentationManifest = () => ({
  generatedAt: new Date().toISOString(),
  syntax: '{ placeholder_name }',
  totalPlaceholders: allPlaceholders.length,
  placeholders: allPlaceholders.map((placeholder) => ({
    token: placeholder.token,
    key: placeholder.key,
    section: placeholder.sectionTitle,
    exampleValue: placeholder.exampleValue,
    revisionSafe: placeholder.revisionSafe,
  })),
});

export const findPlaceholderByToken = (token: string) => placeholderMap.get(token);

export const findPlaceholderByKey = (key: string) => placeholderKeyMap.get(key);
