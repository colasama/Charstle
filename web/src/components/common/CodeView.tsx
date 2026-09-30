import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { rulesLanguage } from './ruleLanguage';
import { cx } from '../../utils/format';

export type CodeLang = 'json' | 'javascript' | 'rules' | 'text' | 'html';

/** 编辑器主题全部走 CSS 变量，自动跟随浅色/深色 */
const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--bg-code)',
    color: 'var(--text)',
    fontSize: '12.5px',
  },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-code)',
    color: 'var(--text-faint)',
    border: 'none',
    paddingLeft: '4px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--text-2)' },
  '.cm-activeLine': { backgroundColor: 'var(--bg-hover)' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--bg-selected-strong) !important',
  },
  '.cm-foldGutter .cm-gutterElement': { color: 'var(--text-faint)' },
  '.cm-tooltip': {
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: '6px',
  },
  '.cm-panels': { backgroundColor: 'var(--bg-panel)', color: 'var(--text)' },
  '.cm-searchMatch': { backgroundColor: 'var(--warning-soft)', outline: '1px solid var(--warning)' },
  '.cm-matchingBracket': { backgroundColor: 'var(--accent-soft)', outline: 'none' },
});

const highlight = HighlightStyle.define([
  { tag: t.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: 'var(--syn-keyword)', fontWeight: '600' },
  { tag: t.string, color: 'var(--syn-string)' },
  { tag: t.special(t.string), color: 'var(--syn-ref)', fontWeight: '600' },
  { tag: [t.number, t.integer, t.float], color: 'var(--syn-number)' },
  { tag: [t.bool, t.null, t.atom], color: 'var(--syn-bool)' },
  { tag: [t.propertyName, t.attributeName], color: 'var(--syn-prop)' },
  { tag: t.variableName, color: 'var(--syn-pattern)', fontWeight: '500' },
  { tag: [t.function(t.variableName), t.definition(t.variableName)], color: 'var(--syn-prop)' },
  { tag: t.regexp, color: 'var(--syn-regexp)' },
  { tag: t.link, color: 'var(--syn-string)', textDecoration: 'underline' },
  { tag: [t.tagName, t.typeName], color: 'var(--syn-keyword)' },
  { tag: t.invalid, color: 'var(--danger)', textDecoration: 'underline wavy' },
]);

const langExt: Record<CodeLang, () => Extension[]> = {
  json: () => [json()],
  javascript: () => [javascript()],
  rules: () => [rulesLanguage],
  html: () => [html()],
  text: () => [],
};

interface Props {
  value: string;
  lang?: CodeLang;
  readOnly?: boolean;
  onChange?: (v: string) => void;
  lineNumbers?: boolean;
  wrap?: boolean;
  className?: string;
  placeholder?: string;
}

export function CodeView({ value, lang = 'text', readOnly, onChange, lineNumbers = true, wrap, className, placeholder }: Props) {
  const extensions = useMemo(
    () => [baseTheme, syntaxHighlighting(highlight), ...langExt[lang](), ...(wrap ? [EditorView.lineWrapping] : [])],
    [lang, wrap],
  );
  return (
    <div className={cx('code-view', className)}>
      <CodeMirror
        value={value}
        height="100%"
        theme="none"
        readOnly={readOnly}
        editable={!readOnly}
        onChange={onChange}
        placeholder={placeholder}
        extensions={extensions}
        basicSetup={{
          lineNumbers,
          foldGutter: lineNumbers,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          autocompletion: false,
        }}
      />
    </div>
  );
}
