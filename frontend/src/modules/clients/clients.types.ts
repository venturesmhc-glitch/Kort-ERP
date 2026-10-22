export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientInput {
  firstName: string;
  lastName: string;
  phone: string;
}
