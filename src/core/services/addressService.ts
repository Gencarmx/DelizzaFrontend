import { supabase } from "../supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "../supabase/types";

export type Address = Tables<"addresses">;
export type AddressInsert = TablesInsert<"addresses">;
export type AddressUpdate = TablesUpdate<"addresses">;

export const addressService = {
  async getAddressesByProfileId(profileId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("profile_id", profileId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching addresses:", error);
      throw error;
    }

    return data || [];
  },

  async getAddressById(id: string): Promise<Address | null> {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching address:", error);
      throw error;
    }

    return data;
  },

  async createAddress(address: AddressInsert): Promise<Address> {
    if (address.is_default) {
      await this.clearDefaultAddress(address.profile_id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert(address)
      .select()
      .single();

    if (error) {
      console.error("Error creating address:", error);
      throw error;
    }

    return data;
  },

  async updateAddress(id: string, updates: AddressUpdate): Promise<Address> {
    if (updates.is_default && updates.profile_id) {
      await this.clearDefaultAddress(updates.profile_id);
    }

    const { data, error } = await supabase
      .from("addresses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating address:", error);
      throw error;
    }

    return data;
  },

  async deleteAddress(id: string): Promise<void> {
    const { error } = await supabase.from("addresses").delete().eq("id", id);

    if (error) {
      console.error("Error deleting address:", error);
      throw error;
    }
  },

  async setDefaultAddress(id: string, profileId: string): Promise<Address> {
    await this.clearDefaultAddress(profileId);

    const { data, error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error setting default address:", error);
      throw error;
    }

    return data;
  },

  async clearDefaultAddress(profileId: string): Promise<void> {
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("profile_id", profileId)
      .eq("is_default", true);

    if (error) {
      console.error("Error clearing default address:", error);
      throw error;
    }
  },

  async getDefaultAddress(profileId: string): Promise<Address | null> {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("profile_id", profileId)
      .eq("is_default", true)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching default address:", error);
      throw error;
    }

    return data || null;
  },
};
