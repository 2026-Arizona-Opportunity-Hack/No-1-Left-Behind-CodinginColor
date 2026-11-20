"use client";

import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useId, useRef, type ReactNode } from "react";

// A real code editor (line numbers, Python colours, auto-indent) in the same dark-green box the lesson
// screens already used for code. Keyboard users are never trapped: Tab indents, but Esc then Tab moves on.

const theme = EditorView.theme({
  "&": { backgroundColor: "#0F2E1C", color: "#E6F4EA", fontSize: "19px", borderRadius: "12px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace", lineHeight: "1.75", borderRadius: "12px" },
  ".cm-content": { padding: "14px 0", caretColor: "#FFFFFF" },
  ".cm-cursor": { borderLeftColor: "#FFFFFF" },
  ".cm-gutters": { backgroundColor: "#0C2618", color: "#6F8F7A", border: "none", borderRadius: "12px 0 0 12px" },
  ".cm-activeLine": { backgroundColor: "#16422A", boxShadow: "inset 3px 0 0 #0DB031" },
  ".cm-activeLineGutter": { backgroundColor: "#16422A", color: "#E6F4EA" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "rgba(168,230,184,0.3) !important" },
  ".cm-matchingBracket": { backgroundColor: "rgba(255,255,255,0.18)", outline: "none" },
});

// The design's syntax colours (all 4.5:1 or better on the dark green).
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: "#FFD75E" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.standard(t.variableName)], color: "#7FDBFF" },
  { tag: [t.definition(t.variableName), t.variableName, t.propertyName], color: "#B8C7FF" },
  { tag: [t.number, t.bool, t.null], color: "#FFB86B" },
  { tag: [t.string, t.special(t.string)], color: "#9BE3AE" },
  { tag: t.comment, color: "#8FAE9A", fontStyle: "italic" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "#E6F4EA" },
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
  /** Buttons for the dark toolbar above the code (Run, Check, Reset). Adds the toolbar when given. */
  toolbar?: ReactNode;
  /** Output and Checks panes shown under the code, inside the same dark frame. */
  footer?: ReactNode;
  fileName?: string;
};

export function CodeEditor({ value, onChange, label, onRun, readOnly = false, minLines = 6, toolbar, footer, fileName = "main.py" }: Props) {
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
          EditorView.theme({ ".cm-content, .cm-gutter": { minHeight: `${minLines * 1.75 * 19 + 28}px` } }),
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
      <div className={toolbar ? "overflow-hidden rounded-xl border border-[#2C5A3F] bg-[#0F2E1C]" : ""}>
        {toolbar && (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#2C5A3F] bg-[#16422A] px-3 py-2">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#2C5A3F] bg-[#0F2E1C] px-3.5 text-base font-medium text-[#E6F4EA]">Python 3</span>
            <span className="font-mono text-base text-[#C9E3D1]">{fileName}</span>
            <span className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</span>
          </div>
        )}
        <div ref={host} />
        {toolbar && footer}
      </div>
      <p id={helpId} className="mt-2 text-base text-muted-foreground">
        Ctrl + Enter runs your code. Tab indents; press Esc and then Tab to leave the editor.
      </p>
    </div>
  );
}
