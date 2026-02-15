[
  {
    "policyname": "Users can update their addresses",
    "cmd": "UPDATE",
    "roles": "{authenticated}",
    "qual": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))",
    "with_check": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))"
  },
  {
    "policyname": "Users can view their addresses",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "policyname": "Users can insert their addresses",
    "cmd": "INSERT",
    "roles": "{authenticated}",
    "qual": null,
    "with_check": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))"
  },
  {
    "policyname": "Users can delete their addresses",
    "cmd": "DELETE",
    "roles": "{authenticated}",
    "qual": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "policyname": "Owners can view customer addresses",
    "cmd": "SELECT",
    "roles": "{authenticated}",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((orders o\n     JOIN businesses b ON ((b.id = o.business_id)))\n     JOIN profiles owner_profile ON ((owner_profile.id = b.owner_id)))\n  WHERE ((o.customer_id = addresses.profile_id) AND (owner_profile.user_id = auth.uid()))))",
    "with_check": null
  }
]

[
  {
    "schemaname": "public",
    "tablename": "addresses",
    "policyname": "Users can update their addresses",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))",
    "with_check": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "addresses",
    "policyname": "Users can view their addresses",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "addresses",
    "policyname": "Users can insert their addresses",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "addresses",
    "policyname": "Users can delete their addresses",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(profile_id IN ( SELECT profiles.id\n   FROM profiles\n  WHERE (profiles.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "addresses",
    "policyname": "Owners can view customer addresses",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM ((orders o\n     JOIN businesses b ON ((b.id = o.business_id)))\n     JOIN profiles owner_profile ON ((owner_profile.id = b.owner_id)))\n  WHERE ((o.customer_id = addresses.profile_id) AND (owner_profile.user_id = auth.uid()))))",
    "with_check": null
  }
]

[
  {
    "indexname": "addresses_pkey",
    "indexdef": "CREATE UNIQUE INDEX addresses_pkey ON public.addresses USING btree (id)"
  },
  {
    "indexname": "idx_addresses_profile",
    "indexdef": "CREATE INDEX idx_addresses_profile ON public.addresses USING btree (profile_id)"
  },
  {
    "indexname": "one_default_address",
    "indexdef": "CREATE UNIQUE INDEX one_default_address ON public.addresses USING btree (profile_id) WHERE (is_default = true)"
  }
]

[
  {
    "trigger_name": "trg_addresses_updated",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION set_updated_at()"
  }
]

[
  {
    "constraint_name": "addresses_profile_id_fkey",
    "constraint_type": "FOREIGN KEY",
    "column_name": "profile_id",
    "foreign_table": "profiles",
    "foreign_column": "id"
  },
  {
    "constraint_name": "addresses_pkey",
    "constraint_type": "PRIMARY KEY",
    "column_name": "id",
    "foreign_table": "addresses",
    "foreign_column": "id"
  }
]

[
  {
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION pg_catalog.\"RI_FKey_check_ins\"()\n RETURNS trigger\n LANGUAGE internal\n PARALLEL SAFE STRICT\nAS $function$RI_FKey_check_ins$function$\n"
  },
  {
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION pg_catalog.\"RI_FKey_check_upd\"()\n RETURNS trigger\n LANGUAGE internal\n PARALLEL SAFE STRICT\nAS $function$RI_FKey_check_upd$function$\n"
  },
  {
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.set_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nbegin\r\n  new.updated_at = now();\r\n  return new;\r\nend;\r\n$function$\n"
  }
]