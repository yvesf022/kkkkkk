"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getMyAddresses,
  createAddress,
  deleteAddress,
  setDefaultAddress,
  Address,
} from "@/lib/api";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address_line_1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  async function loadAddresses() {
    try {
      const data = await getMyAddresses();
      setAddresses(data);
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  async function handleCreate() {
    try {
      await createAddress(form);
      toast.success("Address added");
      setForm({
        full_name: "",
        phone: "",
        address_line_1: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
      });
      loadAddresses();
    } catch {
      toast.error("Failed to create address");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAddress(id);
      toast.success("Address deleted");
      loadAddresses();
    } catch {
      toast.error("Failed to delete address");
    }
  }

  async function handleDefault(id: string) {
    try {
      await setDefaultAddress(id);
      toast.success("Default address updated");
      loadAddresses();
    } catch {
      toast.error("Failed to update default address");
    }
  }

  if (loading) {
    return <p className="p-6">Loading addresses...</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">My Addresses</h1>

      {addresses.map((a) => (
        <div
          key={a.id}
          className="border rounded p-4 mb-3 flex justify-between items-start"
        >
          <div>
            <p className="font-medium">{a.full_name}</p>
            <p>{a.address_line_1}</p>
            <p>
              {a.city}, {a.state} {a.postal_code}
            </p>
            <p>{a.country}</p>
            {a.is_default && (
              <span className="text-sm text-green-600">Default</span>
            )}
          </div>

          <div className="space-x-2">
            {!a.is_default && (
              <button
                onClick={() => handleDefault(a.id)}
                className="text-blue-600 text-sm"
              >
                Set Default
              </button>
            )}
            <button
              onClick={() => handleDelete(a.id)}
              className="text-red-600 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div className="mt-6 border-t pt-4">
        <h2 className="font-semibold mb-2">Add New Address</h2>

        {Object.keys(form).map((key) => (
          <input
            key={key}
            placeholder={key.replaceAll("_", " ")}
            value={(form as any)[key]}
            onChange={(e) =>
              setForm({ ...form, [key]: e.target.value })
            }
            className="w-full border rounded px-3 py-2 mb-2"
          />
        ))}

        <button
          onClick={handleCreate}
          className="bg-black text-white px-4 py-2 rounded mt-2"
        >
          Add Address
        </button>
      </div>
    </div>
  );
}
