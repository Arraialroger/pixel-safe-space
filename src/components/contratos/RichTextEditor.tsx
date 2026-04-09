import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold, Italic, Underline as UnderlineIcon,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Undo, Redo,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type RichTextEditorProps = {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function RichTextEditor({ content, onChange, disabled, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm prose-invert max-w-none min-h-[280px] px-4 py-3 focus:outline-none",
          "text-sm leading-relaxed",
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && disabled !== undefined) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  if (!editor) return null;

  const ToolBtn = ({
    active,
    onPress,
    children,
    label,
  }: {
    active?: boolean;
    onPress: () => void;
    children: React.ReactNode;
    label: string;
  }) => (
    <Toggle
      size="sm"
      pressed={active}
      onPressedChange={() => onPress()}
      aria-label={label}
      disabled={disabled}
      className="h-8 w-8 p-0 data-[state=on]:bg-accent"
    >
      {children}
    </Toggle>
  );

  return (
    <div className={cn("rounded-md border border-input bg-background", disabled && "opacity-50")}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1">
        <ToolBtn active={editor.isActive("bold")} onPress={() => editor.chain().focus().toggleBold().run()} label="Negrito">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onPress={() => editor.chain().focus().toggleItalic().run()} label="Itálico">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onPress={() => editor.chain().focus().toggleUnderline().run()} label="Sublinhado">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn active={editor.isActive("heading", { level: 1 })} onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Título 1">
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Título 2">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 3 })} onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Título 3">
          <Heading3 className="h-4 w-4" />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn active={editor.isActive("bulletList")} onPress={() => editor.chain().focus().toggleBulletList().run()} label="Lista">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onPress={() => editor.chain().focus().toggleOrderedList().run()} label="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolBtn onPress={() => editor.chain().focus().undo().run()} label="Desfazer">
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onPress={() => editor.chain().focus().redo().run()} label="Refazer">
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
