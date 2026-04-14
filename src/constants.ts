export interface Template {
  id: string;
  name: string;
  width: number; // in mm
  height: number; // in mm
  description?: string;
  double: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: "standard-single",
    name: "Standard Single",
    width: 63,
    height: 15,
    description: "Standard size for Magic, Pokémon, etc.",
    double: false
  },
  {
    id: "japanese-single",
    name: "Japanese Single",
    width: 59,
    height: 15,
    description: "Smaller size for Yu-Gi-Oh!, Vanguard, etc.",
    double: false
  },
  {
    id: "standard-double",
    name: "Standard Double",
    width: 63,
    height: 15,
    description: "Standard size for Magic, Pokémon, etc.",
    double: true
  },
  {
    id: "japanese-double",
    name: "Japanese Double",
    width: 59,
    height: 15,
    description: "Smaller size for Yu-Gi-Oh!, Vanguard, etc.",
    double: true
  }
];
