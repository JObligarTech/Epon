import { Fallback } from "@/components/errors/Fallback";
import { ButtonLink } from "@/components/ui";

export default function AppNotFound() {
  return (
    <Fallback
      icon="search"
      title="We could not find that"
      body="The account or page you were after does not exist, or it belongs to someone else."
    >
      <ButtonLink href="/" variant="primary">
        Back to overview
      </ButtonLink>
    </Fallback>
  );
}
