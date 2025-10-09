I want to create a page for my tournament that I'm hosting next week. 

It's gaelic football tournament an it has all kinds of information and rules.

I want all the data to be organized in one big json file. Let's call it a mock because later I might pull it from an API.

The page should be a "Belenux 2025 - Round 2", "Everything you need to know".

In the competion therw will be sevearl competitions. For example u17, u14, u12, u10, u8. girls-only-14, girls-only-u12.

Generally competitions will have a group stage and finals(/elimination) stage.

Some tournamens will only have a finals stage and maybe just the final match itself.

The number of players in teh group and finals stages may differ.
The rules for the group matches and and finals match for a given competion may differ.

Most competitions will have the same rules as each other but there will be differences. 
The number of players per group stage and per knockout stage in each tournament is always to be customized.

For each competition we will have a number of teams. There will never be more than one group. However, there could be 2, 3, 4 or 5 teams in a group.

Each team will have a squad. A team may be made up of players from more than one club. Therefore teh squad will have teh following structure:

    [
      { 
        playerClub: 'Amsterdam',
        playerName: 'Oisin Mallon',
        yearOfBirth: 2011
      },
      { 
        playerClub: 'The Hague',
        playerName: 'James Brown',
        yearOfBirth: 2011
      }
    ]

Each squad will have one or more coaches. Each coach will come from a club. The age of the club is irrelevant

Aside from tournament rules and other info, the page should have information about the location. For example, it should have the address of the club. 

There will also be information about the meals.
The planned fixtures will be presented in a table per competition.
