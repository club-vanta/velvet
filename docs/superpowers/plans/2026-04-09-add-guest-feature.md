# Add Guest Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Add new guest" button to the Guests page that lets any approved staff register a guest by their Mazmo username handle.

**Architecture:** A reusable `InputWithPrefix` UI component is added first, then `AddGuestDialog` is built inside `GuestsPage.tsx`, and finally the page header is updated to show the trigger button.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, openapi-fetch, TanStack Query, Vitest + Testing Library

---

## File Map

| File                                           | Action | Responsibility                            |
| ---------------------------------------------- | ------ | ----------------------------------------- |
| `src/components/ui/input-with-prefix.tsx`      | Create | Reusable input with a non-editable prefix |
| `src/features/guests/GuestsPage.tsx`           | Modify | Add `AddGuestDialog` + header button      |
| `src/components/ui/input-with-prefix.test.tsx` | Create | Unit tests for `InputWithPrefix`          |

---

## Task 1: Create `InputWithPrefix` component

**Files:**

- Create: `src/components/ui/input-with-prefix.tsx`
- Create: `src/components/ui/input-with-prefix.test.tsx`

- [ ] **Step 1.1: Write the failing tests**

```tsx
// src/components/ui/input-with-prefix.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InputWithPrefix } from "./input-with-prefix";

describe("InputWithPrefix", () => {
  it("renders the prefix text", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" />);
    expect(screen.getByText("@")).toBeInTheDocument();
  });

  it("renders the input with the given placeholder", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" />);
    expect(screen.getByPlaceholderText("username")).toBeInTheDocument();
  });

  it("the prefix element is not an input — it cannot be typed into", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" />);
    // Only one input in the DOM
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("forwards value and onChange to the input", async () => {
    const onChange = vi.fn();
    render(
      <InputWithPrefix
        prefix="@"
        placeholder="username"
        value=""
        onChange={onChange}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("username"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("forwards the disabled prop to the input", () => {
    render(<InputWithPrefix prefix="@" placeholder="username" disabled />);
    expect(screen.getByPlaceholderText("username")).toBeDisabled();
  });
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
cd /home/krapp/dev/vanta/velvet/.worktrees/feat/add-guest
npm run test:run -- src/components/ui/input-with-prefix.test.tsx
```

Expected: FAIL — `Cannot find module './input-with-prefix'`

- [ ] **Step 1.3: Implement `InputWithPrefix`**

```tsx
// src/components/ui/input-with-prefix.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface InputWithPrefixProps extends React.ComponentProps<"input"> {
  prefix: string;
}

function InputWithPrefix({
  prefix,
  className,
  disabled,
  ...props
}: InputWithPrefixProps) {
  return (
    <div
      className={cn(
        "flex h-8 w-full overflow-hidden rounded-lg border border-input transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
      )}
    >
      <span className="flex items-center border-r border-input bg-input/30 px-2.5 text-sm text-muted-foreground select-none">
        {prefix}
      </span>
      <input
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground dark:bg-transparent",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export { InputWithPrefix };
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npm run test:run -- src/components/ui/input-with-prefix.test.tsx
```

Expected: 5 passing, 0 failing

- [ ] **Step 1.5: Commit**

```bash
git add src/components/ui/input-with-prefix.tsx src/components/ui/input-with-prefix.test.tsx
git commit -m "feat(ui): add InputWithPrefix reusable component"
```

---

## Task 2: Add `AddGuestDialog` and update `GuestsPage` header

**Files:**

- Modify: `src/features/guests/GuestsPage.tsx`

- [ ] **Step 2.1: Add `AddGuestDialog` and update the header in `GuestsPage.tsx`**

Add the import at the top of `GuestsPage.tsx`:

```tsx
import { InputWithPrefix } from "@/components/ui/input-with-prefix";
```

Add this component before `AllGuestsTab`:

```tsx
function AddGuestDialog({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error, response } = await api.POST("/guests/", {
        body: { username: username.trim() },
      });
      if (error) {
        if (response.status === 404) {
          throw new Error(
            "No se encontró el usuario en Mazmo. Revisá el handle.",
          );
        }
        if (response.status === 409) {
          throw new Error("Este guest ya está registrado en el sistema.");
        }
        if (response.status === 504) {
          throw new Error("No se pudo conectar a Mazmo. Intentá de nuevo.");
        }
        throw new Error(
          (error as { detail?: string }).detail ??
            "Algo salió mal. Intentá de nuevo.",
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      toast.success("Guest agregado correctamente");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new guest</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <label htmlFor="guest-username" className="text-sm font-medium">
            Mazmo username
          </label>
          <InputWithPrefix
            id="guest-username"
            prefix="@"
            placeholder="cindydark"
            autoComplete="off"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={mutation.isPending}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!username.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Update `GuestsPage`:

```tsx
export function GuestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role.name === "ADMIN";
  const [addGuestOpen, setAddGuestOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Guests</h1>
        <Button onClick={() => setAddGuestOpen(true)}>Add new guest</Button>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Guests</TabsTrigger>
          <TabsTrigger value="banned">Banned</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <AllGuestsTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="banned" className="mt-4">
          <BannedGuestsTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
      {addGuestOpen && (
        <AddGuestDialog onClose={() => setAddGuestOpen(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2.2: Run typecheck and lint**

```bash
npm run check
```

Expected: no errors

- [ ] **Step 2.3: Run all tests**

```bash
npm run test:run
```

Expected: all passing

- [ ] **Step 2.4: Commit**

```bash
git add src/features/guests/GuestsPage.tsx
git commit -m "feat(guests): add AddGuestDialog and Add new guest button"
```

---

## Task 3: Push and open PR

- [ ] **Step 3.1: Push branch**

```bash
git push -u origin feat/add-guest
```

- [ ] **Step 3.2: Open PR**

```bash
gh pr create --title "feat(guests): add guest by Mazmo username" --body "$(cat <<'EOF'
## Summary

- New reusable `InputWithPrefix` component (`src/components/ui/input-with-prefix.tsx`)
- "Add new guest" button in the Guests page header (visible to all staff)
- `AddGuestDialog`: single `@username` field, calls `POST /guests/`, handles 404/409/504 errors

## Test plan

- [ ] Add a guest with a valid Mazmo username → appears in the list
- [ ] Add a guest with a non-existent username → "No se encontró el usuario en Mazmo"
- [ ] Add a guest that already exists → "Este guest ya está registrado en el sistema"
- [ ] Unit tests for `InputWithPrefix` passing in CI

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
