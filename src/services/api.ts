import { Client, Seller, Simulation } from "../types";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const clientService = {
  async getAll() {
    const snapshot = await getDocs(collection(db, "clients"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
  },
  async add(client: Client) {
    await setDoc(doc(db, "clients", client.id), client);
  },
  subscribe(callback: (clients: Client[]) => void) {
    return onSnapshot(collection(db, "clients"), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
  },
  async delete(id: string) {
    await deleteDoc(doc(db, "clients", id));
  }
};

export const sellerService = {
  async getAll() {
    const snapshot = await getDocs(collection(db, "sellers"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
  },
  async add(seller: Seller) {
    await setDoc(doc(db, "sellers", seller.id), seller);
  },
  subscribe(callback: (sellers: Seller[]) => void) {
    return onSnapshot(collection(db, "sellers"), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller)));
    });
  },
  async delete(id: string) {
    await deleteDoc(doc(db, "sellers", id));
  }
};

export const simulationService = {
  async save(simulation: Simulation) {
    return await addDoc(collection(db, "simulations"), simulation);
  },
  async getBySeller(sellerId: string) {
    const q = query(collection(db, "simulations"), where("sellerId", "==", sellerId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Simulation));
  }
};

export const mapsService = {
  async geocode(address: string) {
    const response = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].geometry.location;
    }
    throw new Error("Address not found");
  },
  async getDirections(origin: any, destination: any, waypoints: any[]) {
    const response = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, waypoints }),
    });
    return await response.json();
  }
};
