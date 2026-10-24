import type { MemberType, PersonRef } from "../types";

const personKey = (person: Pick<PersonRef, "memberType" | "personId">) =>
  `${person.memberType}:${person.personId}`;

export function pinNewlySelected(
  people: PersonRef[],
  newlySelected: PersonRef[],
  memberType: MemberType,
) {
  const visibleKeys = new Set(people.map(personKey));
  return [
    ...newlySelected.filter(
      (person) =>
        person.memberType === memberType &&
        !visibleKeys.has(personKey(person)),
    ),
    ...people,
  ];
}
