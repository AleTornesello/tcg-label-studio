export const LocalStorageKeys = {
  Projects: "tcg_labels_studio_projects",
  LastOpened: "tcg_labels_studio_last_opened",
  CustomTemplates: "tcg_labels_studio_custom_templates"
}

export interface TemplatePart {
  height: number;
  isWritable: boolean;
}

export interface Template {
  id: string;
  name: string;
  width: number; // in mm
  parts: TemplatePart[];
  description?: string;
  custom?: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: "standard-single",
    name: "Standard Single",
    width: 63,
    parts: [{ height: 15, isWritable: true }],
    description: "Standard size for Magic, Pokémon, etc."
  },
  {
    id: "japanese-single",
    name: "Japanese Single",
    width: 59,
    parts: [{ height: 15, isWritable: true }],
    description: "Smaller size for Yu-Gi-Oh!, Vanguard, etc."
  },
  {
    id: "standard-double",
    name: "Standard Double",
    width: 63,
    parts: [
      { height: 15, isWritable: true },
      { height: 15, isWritable: false }
    ],
    description: "Standard size for Magic, Pokémon, etc. (Foldable)"
  },
  {
    id: "japanese-double",
    name: "Japanese Double",
    width: 59,
    parts: [
      { height: 15, isWritable: true },
      { height: 15, isWritable: false }
    ],
    description: "Smaller size for Yu-Gi-Oh!, Vanguard, etc. (Foldable)"
  },
  {
    id: "standard-full",
    name: "Full Standard",
    width: 63,
    parts: [
      { height: 88, isWritable: true }
    ],
    description: "Standard size for Magic, Pokémon, etc."
  },
  {
    id: "japanese-full",
    name: "Full Japanese",
    width: 59,
    parts: [
      { height: 86, isWritable: true }
    ],
    description: "Smaller size for Yu-Gi-Oh!, Vanguard, etc."
  }
];
