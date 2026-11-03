# Section Editor in Practice

GoWind CMS pioneered a section-based content editor built on SectionType, allowing content editors to build rich content like building blocks. Each section has its own type and configuration, with support for text, image, video, code block, carousel, and many other section types. This tutorial explains the architecture, data model, and front-/back-end implementation of the section editor.

## Prerequisites

- You have read [CMS Frontend Architecture](./frontend-architecture.md)
- Understand basic concepts of TipTap / rich text editors

## 1. Section Editor Architecture

### 1.1 Traditional Rich Text vs. Section Editor

```mermaid
graph TB
    subgraph 传统富文本
        T1[一个大文本字段 content]
        T1 --> T2["问题：结构化数据混在HTML中<br/>难以提取、复用、转换"]
    end

    subgraph 区块编辑器
        S1[Section 1: 文本区块]
        S2[Section 2: 图片区块]
        S3[Section 3: 代码区块]
        S4[Section 4: 视频区块]
        S1 & S2 & S3 & S4 --> S5["JSON 数组结构<br/>可独立提取、渲染、转换"]
    end
```

| Comparison | Traditional Rich Text | Section Editor |
|--------|----------|-----------|
| Data structure | HTML string | JSON section array |
| Structured data | Hard to extract | Extractable by section type |
| Extensibility | Depends on editor plugins | Custom section types possible |
| Multi-client rendering | Requires HTML parsing | Each client renders sections independently |
| Data migration | Difficult | Section-level migration |

### 1.2 Section Types

| Section | SectionType | Description |
|---------|-------------|------|
| Text paragraph | `SECTION_TYPE_TEXT` | Rich text paragraph (Markdown supported) |
| Heading | `SECTION_TYPE_HEADING` | H1-H6 headings |
| Image | `SECTION_TYPE_IMAGE` | Single/multiple images |
| Code block | `SECTION_TYPE_CODE` | Code highlighting |
| Video | `SECTION_TYPE_VIDEO` | Video embedding |
| Quote | `SECTION_TYPE_QUOTE` | Quoted text |
| Divider | `SECTION_TYPE_DIVIDER` | Horizontal rule |
| List | `SECTION_TYPE_LIST` | Ordered/unordered lists |
| Table | `SECTION_TYPE_TABLE` | Data tables |
| Carousel | `SECTION_TYPE_CAROUSEL` | Image carousels |
| Button | `SECTION_TYPE_BUTTON` | CTA buttons |
| Embed | `SECTION_TYPE_EMBED` | Third-party embeds (YouTube/Twitter) |

## 2. Data Model

### 2.1 The Section Message Definition

```protobuf
// content/service/v1/section.proto

message Section {
  optional string id = 1;              // 区块 UUID
  optional SectionType type = 2;       // 区块类型
  optional uint32 sort_order = 3 [json_name = "sortOrder"];  // 排序
  optional SectionData data = 4;       // 区块数据
}

enum SectionType {
  SECTION_TYPE_UNSPECIFIED = 0;
  SECTION_TYPE_HEADING = 1;
  SECTION_TYPE_TEXT = 2;
  SECTION_TYPE_IMAGE = 3;
  SECTION_TYPE_CODE = 4;
  SECTION_TYPE_VIDEO = 5;
  SECTION_TYPE_QUOTE = 6;
  SECTION_TYPE_DIVIDER = 7;
  SECTION_TYPE_LIST = 8;
  SECTION_TYPE_TABLE = 9;
  SECTION_TYPE_CAROUSEL = 10;
  SECTION_TYPE_BUTTON = 11;
  SECTION_TYPE_EMBED = 12;
}

message SectionData {
  oneof data {
    HeadingData heading = 1;
    TextData text = 2;
    ImageData image = 3;
    CodeData code = 4;
    VideoData video = 5;
    QuoteData quote = 6;
    ListData list = 8;
    TableData table = 9;
    CarouselData carousel = 10;
    ButtonData button = 11;
    EmbedData embed = 12;
  }
}

message HeadingData {
  optional uint32 level = 1;     // 1-6
  optional string text = 2;
}

message TextData {
  optional string content = 1;   // Markdown 或 HTML
}

message ImageData {
  optional string url = 1;
  optional string alt = 2;
  optional string caption = 3;
  optional uint32 width = 4;
  optional uint32 height = 5;
}

message CodeData {
  optional string language = 1;  // go, javascript, python...
  optional string code = 2;
  optional bool show_line_numbers = 3 [json_name = "showLineNumbers"];
}

message VideoData {
  optional string url = 1;
  optional string poster = 2;    // 封面图
  optional uint32 duration = 3;
}
```

### 2.2 Sections in the Post

```protobuf
// content/service/v1/post.proto
message Post {
  // ...
  // 内容以区块数组存储
  repeated Section sections = 14 [json_name = "sections"];

  // 兼容字段：纯文本摘要（从区块自动生成）
  optional string summary = 15;
}
```

### 2.3 Storage Format

```json
{
  "id": 42,
  "title": "GoWind 架构解析",
  "sections": [
    {
      "id": "sec-001",
      "type": "SECTION_TYPE_HEADING",
      "sortOrder": 1,
      "data": {
        "heading": { "level": 2, "text": "架构概述" }
      }
    },
    {
      "id": "sec-002",
      "type": "SECTION_TYPE_TEXT",
      "sortOrder": 2,
      "data": {
        "text": { "content": "GoWind CMS 采用三服务架构..." }
      }
    },
    {
      "id": "sec-003",
      "type": "SECTION_TYPE_CODE",
      "sortOrder": 3,
      "data": {
        "code": {
          "language": "go",
          "code": "func main() {\n    fmt.Println(\"Hello\")\n}",
          "showLineNumbers": true
        }
      }
    },
    {
      "id": "sec-004",
      "type": "SECTION_TYPE_IMAGE",
      "sortOrder": 4,
      "data": {
        "image": {
          "url": "https://oss.example.com/architecture.png",
          "alt": "架构图",
          "caption": "图1：CMS 三服务架构"
        }
      }
    }
  ]
}
```

## 3. Admin Console Editor

### 3.1 The TipTap-Based Section Editor

```vue
<!-- components/editor/SectionEditor.vue -->
<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

const props = defineProps<{ modelValue: Section[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: Section[]] }>();

const sections = ref<Section[]>(props.modelValue || []);

// TipTap 编辑器配置
const editor = useEditor({
  extensions: [StarterKit, Image, CodeBlockLowlight],
  content: sectionsToHTML(sections.value),
  onUpdate: ({ editor }) => {
    // 将 TipTap JSON 转换为 Section 数组
    sections.value = htmlToSections(editor.getHTML());
    emit('update:modelValue', sections.value);
  },
});

// 监听外部数据变化
watch(() => props.modelValue, (val) => {
  if (val && JSON.stringify(val) !== JSON.stringify(sections.value)) {
    sections.value = val;
    editor.value?.commands.setContent(sectionsToHTML(val));
  }
});

// 添加区块
const addSection = (type: SectionType) => {
  const newSection: Section = {
    id: generateUUID(),
    type,
    sortOrder: sections.value.length + 1,
    data: createDefaultData(type),
  };
  sections.value.push(newSection);
  emit('update:modelValue', sections.value);
};

const moveSection = (index: number, direction: 'up' | 'down') => {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sections.value.length) return;
  [sections.value[index], sections.value[targetIndex]] =
    [sections.value[targetIndex], sections.value[index]];
  // 重新排序
  sections.value.forEach((s, i) => (s.sortOrder = i + 1));
  emit('update:modelValue', sections.value);
};

const deleteSection = (id: string) => {
  sections.value = sections.value.filter((s) => s.id !== id);
  emit('update:modelValue', sections.value);
};

// 工具栏可用的区块类型
const sectionTypes = [
  { type: 1, label: '标题', icon: 'HeadingOutlined' },
  { type: 2, label: '文本', icon: 'FontSizeOutlined' },
  { type: 3, label: '图片', icon: 'PictureOutlined' },
  { type: 4, label: '代码', icon: 'CodeOutlined' },
  { type: 5, label: '视频', icon: 'VideoCameraOutlined' },
  { type: 6, label: '引用', icon: 'MessageOutlined' },
  { type: 9, label: '表格', icon: 'TableOutlined' },
  { type: 11, label: '按钮', icon: 'LinkOutlined' },
];
</script>

<template>
  <div class="section-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <Tooltip v-for="st in sectionTypes" :key="st.type" :title="st.label">
        <Button @click="addSection(st.type)">
          <component :is="st.icon" />
        </Button>
      </Tooltip>
    </div>

    <!-- 区块列表（可拖拽排序） -->
    <draggable
      v-model="sections"
      item-key="id"
      handle=".drag-handle"
      @end="$emit('update:modelValue', sections)"
    >
      <template #item="{ element, index }">
        <div class="section-item">
          <div class="drag-handle">⋮⋮</div>
          <SectionRenderer
            :section="element"
            @update="(data) => element.data = data"
          />
          <div class="section-actions">
            <Button size="small" @click="moveSection(index, 'up')">上移</Button>
            <Button size="small" @click="moveSection(index, 'down')">下移</Button>
            <Button size="small" danger @click="deleteSection(element.id)">删除</Button>
          </div>
        </div>
      </template>
    </draggable>

    <!-- 空状态 -->
    <div v-if="sections.length === 0" class="empty-state">
      <p>点击上方工具栏按钮添加内容区块</p>
    </div>
  </div>
</template>
```

### 3.2 Section Renderer Component

```vue
<!-- components/editor/SectionRenderer.vue -->
<script setup lang="ts">
const props = defineProps<{ section: Section }>();
const emit = defineEmits<{ update: [data: SectionData] }>();

const isEditing = ref(false);
</script>

<template>
  <div class="section-renderer" @dblclick="isEditing = true">
    <!-- 标题区块 -->
    <component
      :is="`h${section.data.heading?.level || 2}`"
      v-if="section.type === 1"
    >
      <EditableText
        v-model="section.data.heading.text"
        :editing="isEditing"
        @blur="emit('update', section.data)"
      />
    </component>

    <!-- 文本区块 -->
    <div v-else-if="section.type === 2" class="text-section">
      <TipTapEditor
        v-model="section.data.text.content"
        :editing="isEditing"
        @blur="emit('update', section.data)"
      />
    </div>

    <!-- 图片区块 -->
    <div v-else-if="section.type === 3" class="image-section">
      <MediaPicker
        v-if="isEditing"
        v-model="section.data.image.url"
        @select="emit('update', section.data)"
      />
      <figure v-else>
        <img
          :src="section.data.image.url"
          :alt="section.data.image.alt"
          :style="{ maxWidth: section.data.image.width + 'px' }"
        />
        <figcaption v-if="section.data.image.caption">
          {{ section.data.image.caption }}
        </figcaption>
      </figure>
    </div>

    <!-- 代码区块 -->
    <div v-else-if="section.type === 4" class="code-section">
      <select v-if="isEditing" v-model="section.data.code.language">
        <option value="go">Go</option>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
      </select>
      <pre><code :class="`language-${section.data.code.language}`">{{
        section.data.code.code
      }}</code></pre>
    </div>

    <!-- 视频区块 -->
    <div v-else-if="section.type === 5" class="video-section">
      <video
        :src="section.data.video.url"
        :poster="section.data.video.poster"
        controls
      />
    </div>
  </div>
</template>
```

## 4. Frontend Section Rendering

### 4.1 React Frontend Rendering

```tsx
// src/components/post/SectionRenderer.tsx
import Image from 'next/image';

interface SectionRendererProps {
  sections: Section[];
}

export function SectionRenderer({ sections }: SectionRendererProps) {
  return (
    <div className="post-content">
      {sections
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => {
          switch (section.type) {
            case 1: // HEADING
              const Tag = `h${section.data.heading?.level || 2}` as keyof JSX.IntrinsicElements;
              return <Tag key={section.id}>{section.data.heading?.text}</Tag>;

            case 2: // TEXT
              return (
                <div
                  key={section.id}
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: section.data.text?.content }}
                />
              );

            case 3: // IMAGE
              return (
                <figure key={section.id} className="my-8">
                  <Image
                    src={section.data.image?.url}
                    alt={section.data.image?.alt || ''}
                    width={section.data.image?.width || 800}
                    height={section.data.image?.height || 400}
                    className="rounded-lg"
                  />
                  {section.data.image?.caption && (
                    <figcaption className="text-center text-gray-500 text-sm mt-2">
                      {section.data.image.caption}
                    </figcaption>
                  )}
                </figure>
              );

            case 4: // CODE
              return (
                <pre key={section.id} className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <code className={`language-${section.data.code?.language}`}>
                    {section.data.code?.code}
                  </code>
                </pre>
              );

            case 5: // VIDEO
              return (
                <video
                  key={section.id}
                  src={section.data.video?.url}
                  poster={section.data.video?.poster}
                  controls
                  className="w-full rounded-lg my-8"
                />
              );

            case 6: // QUOTE
              return (
                <blockquote
                  key={section.id}
                  className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-6"
                >
                  {section.data.quote?.text}
                </blockquote>
              );

            case 7: // DIVIDER
              return <hr key={section.id} className="my-8" />;

            case 11: // BUTTON
              return (
                <div key={section.id} className="text-center my-6">
                  <a
                    href={section.data.button?.url}
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {section.data.button?.text}
                  </a>
                </div>
              );

            default:
              return null;
          }
        })}
    </div>
  );
}
```

### 4.2 Flutter Frontend Rendering

```dart
// features/post_detail/presentation/widgets/section_list.dart
class SectionList extends StatelessWidget {
  final List<Section> sections;

  @override
  Widget build(BuildContext context) {
    final sorted = sections..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));

    return Column(
      children: sorted.map((section) => _buildSection(section)).toList(),
    );
  }

  Widget _buildSection(Section section) {
    switch (section.type) {
      case SectionType.heading:
        return _buildHeading(section.data.heading);
      case SectionType.text:
        return _buildText(section.data.text);
      case SectionType.image:
        return _buildImage(section.data.image);
      case SectionType.code:
        return _buildCode(section.data.code);
      case SectionType.video:
        return _buildVideo(section.data.video);
      default:
        return SizedBox.shrink();
    }
  }

  Widget _buildImage(ImageData data) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 16),
      child: Column(
        children: [
          Image.network(data.url),
          if (data.caption != null)
            Text(data.caption!, style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
```

## 5. Automatic Summary Generation

A text summary is automatically generated from the section data:

```go
// app/core/service/internal/service/post_service.go
func (s *PostService) generateSummary(sections []*contentV1.Section) string {
    var sb strings.Builder
    for _, sec := range sections {
        switch sec.GetType() {
        case contentV1.SectionType_SECTION_TYPE_TEXT:
            // 提取文本内容
            content := sec.GetData().GetText().GetContent()
            sb.WriteString(stripHTML(content))
            sb.WriteString(" ")
        case contentV1.SectionType_SECTION_TYPE_HEADING:
            sb.WriteString(sec.GetData().GetHeading().GetText())
            sb.WriteString(" ")
        }
        // 截取前 200 字符
        if sb.Len() > 200 {
            break
        }
    }
    summary := sb.String()
    if len(summary) > 200 {
        summary = summary[:200] + "..."
    }
    return summary
}
```

## 6. Custom Section Types

### 6.1 Extending SectionType

```protobuf
// 新增自定义区块类型
enum SectionType {
  // ... 标准类型
  SECTION_TYPE_CALLOUT = 100;     // 提示框
  SECTION_TYPE_GALLERY = 101;     // 图库
  SECTION_TYPE_TIMELINE = 102;    // 时间线
  SECTION_TYPE_PRICING = 103;     // 价格表
}
```

### 6.2 Registering Custom Sections on the Frontend

```typescript
// 注册自定义区块渲染器
const sectionRenderers: Record<number, React.FC<{ data: any }>> = {
  100: CalloutSection,    // 提示框
  101: GallerySection,    // 图库
  102: TimelineSection,   // 时间线
  103: PricingSection,    // 价格表
};

export function SectionRenderer({ section }: { section: Section }) {
  const Renderer = sectionRenderers[section.type];
  if (Renderer) return <Renderer data={section.data} />;
  return <div>未知区块类型</div>;
}
```

## 7. Checklist

| Check Item | Description |
|--------|------|
| Section message definition | Section type enum + data messages |
| Post section association | sections array field |
| Admin console editor | TipTap + drag-and-drop sorting + section operations |
| Section renderer component | Independent renderer per type |
| Frontend multi-client rendering | React / Flutter / Taro |
| Automatic summary generation | Text extracted from sections |
| Custom sections | Extensible types |

## Related Documents

- [CMS Frontend Architecture](./frontend-architecture.md)
- [Content Publishing Workflow in Practice](./tutorial-content-workflow.md)
- [Media Asset Management in Practice](./tutorial-media-asset.md)
- [Frontend Application Development in Practice](./tutorial-frontend-app.md)
