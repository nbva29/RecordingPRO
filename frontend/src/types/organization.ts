export interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

export interface Organization {
  id: number;
  name: string;
  shortName: string;
  category: string;
  description: string;
  address: string;
  city: string;
  workingHours: string;
  background: string;
  services: Service[];
  nextAvailable?: string;
}
