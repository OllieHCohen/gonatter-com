"use client";

import { useActionState } from "react";
import { grantAdminAction, type AdminGrantState } from "@/app/admin/admins/actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Field";

export function GrantAdminForm() {
  const [state, action, pending] = useActionState<AdminGrantState, FormData>(grantAdminAction, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="email">Grant admin access</Label>
        <div className="mt-1 flex gap-2">
          <Input id="email" name="email" type="email" required placeholder="user@example.com" className="flex-1" />
          <Button type="submit" disabled={pending}>
            {pending ? "Granting…" : "Make admin"}
          </Button>
        </div>
      </div>
      <FieldError>{state.error}</FieldError>
      {state.done && <p className="text-sm font-semibold text-teal">{state.done}</p>}
    </form>
  );
}
