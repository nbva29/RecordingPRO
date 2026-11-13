export interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

export interface Organization {
  id: number;
  name: string;
  shortName?: string;
  category?: string;
  categories?: { id: number; name: string }[];
  description: string | null;
  address: string;
  city: string;
  phone?: string | null;
  workingHours?: string;
  background: string;
  services: Service[];
  nextAvailable?: string;
}
