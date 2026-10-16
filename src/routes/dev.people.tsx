import { createFileRoute } from "@tanstack/react-router";
import { Character } from "@/themes/_shared/cast/Character";
import { PEOPLE } from "@/themes/_shared/cast/person";

/** Dev only: the 40 ready-made people with their live faces, for checking the art. */
export const Route = createFileRoute("/dev/people")({
  component: () =>
    import.meta.env.DEV ? (
      <div className="grid min-h-screen grid-cols-5 gap-4 bg-[#F4EEE3] p-6">
        {PEOPLE.map((p) => (
          <div key={p.id} className="grid place-items-center rounded-3xl bg-white p-3">
            <Character setting={{ type: "person", person: p.person, preset: p.id }} size={200} live={false} follow={false} showName={false} />
            <p className="mt-1 text-sm">{p.name}</p>
          </div>
        ))}
      </div>
    ) : null,
});
