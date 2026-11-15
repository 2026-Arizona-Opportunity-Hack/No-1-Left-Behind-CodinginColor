"use client";

import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useId, useRef } from "react";

// A real code editor (line numbers, Python colours, auto-indent) in the same dark-green box the lesson
// screens already used for code. Keyboard users are never trapped: Tab indents, but Esc then Tab moves on.

const theme = EditorView.theme({
  "&": { backgroundColor: "#0F2E1C", color: "#E6F4EA", fontSize: "18px", borderRadius: "18px" },
  "&.cm-focused": { outline: "3px solid #FFD75E" },
  ".cm-scroller": { fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace", lineHeight: "1.75", borderRadius: "18px" },
  ".cm-content": { padding: "14px 0", caretColor: "#FFD75E" },
  ".cm-cursor": { borderLeftColor: "#FFD75E" },
  ".cm-gutters": { backgroundColor: "#0A2315", color: "#8FB59C", border: "none", borderRadius: "18px 0 0 18px" },
  ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.06)" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.08)", color: "#E6F4EA" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(255,215,94,0.3) !important" },
  ".cm-matchingBracket": { backgroundColor: "rgba(255,255,255,0.18)", outline: "none" },
});

// Colours picked to read well (4.5:1 or better) on the dark green.
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword], color: "#FFD75E", fontWeight: "600" },
  { tag: [t.string, t.special(t.string)], color: "#A8E6B5" },
  { tag: [t.number, t.bool, t.null], color: "#9CCBFF" },
  { tag: t.comment, color: "#8FB59C", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.definition(t.variableName)], color: "#FFFFFF" },
  { tag: [t.className, t.typeName], color: "#D9C8FF" },
]);

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Read aloud by screen readers (the editor has no visible <label>). */
  label: string;
  /** Called on Ctrl/Cmd + Enter. */
  onRun?: () => void;
  readOnly?: boolean;
  /** Height in lines when empty-ish; the editor grows with its code. */
  minLines?: number;
};

export function CodeEditor({ value, onChange, label, onRun, readOnly = false, minLines = 8 }: Props) {
  const helpId = useId();
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Keep the newest callbacks without rebuilding the editor on every keystroke.
  const callbacks = useRef({ onChange, onRun });
  useEffect(() => { callbacks.current = { onChange, onRun }; });

  useEffect(() => {
    if (!host.current) return;
    let tabLeavesEditor = false; // set by Esc so the next Tab moves focus instead of indenting
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), history(), drawSelection(),
          indentOnInput(), bracketMatching(), indentUnit.of("    "), EditorState.tabSize.of(4),
          python(), syntaxHighlighting(highlight), theme,
          EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ "aria-label": label, "aria-describedby": helpId }),
          EditorView.theme({ ".cm-content, .cm-gutter": { minHeight: `${minLines * 1.75 * 18 + 28}px` } }),
          keymap.of([
            { key: "Mod-Enter", run: () => { callbacks.current.onRun?.(); return true; } },
            { key: "Escape", run: () => { tabLeavesEditor = true; return true; } },
            { key: "Tab", run: (v) => { if (tabLeavesEditor) { tabLeavesEditor = false; return false; } return indentMore(v); }, shift: (v) => indentLess(v) },
            ...defaultKeymap, ...historyKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) { tabLeavesEditor = false; callbacks.current.onChange(u.state.doc.toString()); }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => { editor.destroy(); view.current = null; };
    // The editor is created once; later value changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, readOnly, minLines, helpId]);

  // Outside changes (for example "Reset code") replace the text; typing never triggers this.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return (
    <div>
      <div ref={host} />
      <p id={helpId} className="mt-2 text-sm text-muted-foreground">
        Ctrl + Enter runs your code. Tab indents; press Esc and then Tab to leave the editor.
      </p>
    </div>
  );
}
