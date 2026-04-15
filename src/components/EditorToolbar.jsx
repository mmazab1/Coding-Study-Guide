const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
]

const FONT_SIZES = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px']

const LINE_HEIGHTS = [
  { label: 'Single (1.0)', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: 'Double (2.0)', value: '2' },
  { label: '2.5', value: '2.5' },
  { label: 'Triple (3.0)', value: '3' },
]

function Divider() {
  return <span className="tb-divider" />
}

function TbBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      className={`tb-btn ${active ? 'tb-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

export default function EditorToolbar({ editor }) {
  if (!editor) return null

  function getHeadingValue() {
    for (let i = 1; i <= 3; i++) {
      if (editor.isActive('heading', { level: i })) return String(i)
    }
    return '0'
  }

  function setHeading(val) {
    if (val === '0') editor.chain().focus().setParagraph().run()
    else editor.chain().focus().setHeading({ level: Number(val) }).run()
  }

  function getCurrentFontSize() {
    return editor.getAttributes('textStyle').fontSize || ''
  }

  function getCurrentFontFamily() {
    return editor.getAttributes('textStyle').fontFamily || ''
  }

  function getCurrentLineHeight() {
    const attrs = editor.getAttributes('paragraph')
    return attrs.lineHeight || editor.getAttributes('heading').lineHeight || ''
  }

  return (
    <div className="toolbar">
      {/* Undo / Redo */}
      <TbBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>↩</TbBtn>
      <TbBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>↪</TbBtn>

      <Divider />

      {/* Heading / Paragraph */}
      <select
        className="tb-select"
        value={getHeadingValue()}
        onChange={(e) => setHeading(e.target.value)}
        title="Style"
      >
        <option value="0">Paragraph</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>

      <Divider />

      {/* Font family */}
      <select
        className="tb-select tb-select-wide"
        value={getCurrentFontFamily()}
        onChange={(e) => {
          if (e.target.value) editor.chain().focus().setFontFamily(e.target.value).run()
          else editor.chain().focus().unsetFontFamily().run()
        }}
        title="Font"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="tb-select tb-select-sm"
        value={getCurrentFontSize()}
        onChange={(e) => {
          if (e.target.value) editor.chain().focus().setFontSize(e.target.value).run()
          else editor.chain().focus().unsetFontSize().run()
        }}
        title="Font size"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s.replace('px', '')}</option>
        ))}
      </select>

      <Divider />

      {/* Bold / Italic / Underline / Strike */}
      <TbBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </TbBtn>
      <TbBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </TbBtn>
      <TbBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </TbBtn>
      <TbBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </TbBtn>

      <Divider />

      {/* Text color */}
      <label className="tb-color-wrap" title="Text color">
        <span className="tb-color-label">A</span>
        <input
          type="color"
          className="tb-color-input"
          value={editor.getAttributes('textStyle').color || '#e2e8f0'}
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
        <span
          className="tb-color-bar"
          style={{ background: editor.getAttributes('textStyle').color || '#e2e8f0' }}
        />
      </label>

      <Divider />

      {/* Alignment */}
      <TbBtn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>⬤≡</TbBtn>
      <TbBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>≡</TbBtn>
      <TbBtn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>≡⬤</TbBtn>
      <TbBtn title="Justify" active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>☰</TbBtn>

      <Divider />

      {/* Lists */}
      <TbBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• ≡</TbBtn>
      <TbBtn title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. ≡</TbBtn>

      <Divider />

      {/* Line height */}
      <select
        className="tb-select"
        value={getCurrentLineHeight()}
        onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
        title="Line spacing"
      >
        <option value="">Spacing</option>
        {LINE_HEIGHTS.map((lh) => (
          <option key={lh.value} value={lh.value}>{lh.label}</option>
        ))}
      </select>
    </div>
  )
}
