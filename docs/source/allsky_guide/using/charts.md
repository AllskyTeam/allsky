# Charts

The **Charts** page is where Allsky’s recorded values stop feeling like background telemetry and start becoming something you can actually work with. It is not just a page that displays one graph. It is a chart workspace. You can open a collection of charts, arrange them, resize them, group them into tabs, apply a shared time range, and come back later to find that layout still in place. That makes the page useful in a different way from most of the rest of the WebUI. The status pages are designed to tell you what is happening right now. The Charts page is designed to help you understand what has been happening over time.

![](/assets/using_images/charts_main_page.png){ width="100%" }

/// caption
Placeholder: Charts page main layout
///

In practice, this means the page is well suited to questions that are difficult to answer from a single number or a single message. If you want to know whether a problem appeared suddenly or gradually, whether one value changed at the same time as another, or whether a pattern repeats over several nights, charts are usually the most useful way to think about it. A graph will not solve the problem for you, but it often makes the shape of the problem much easier to see.

!!! info "Think of Charts as a workspace, not a report"

    The page is designed to be arranged around the questions you care about. One user might build a layout for system health and housekeeping. Another might focus on camera behaviour or module-provided metrics. A third might create several custom charts just to compare related signals over the same period. The page supports all of those approaches because it is intended to be worked with, not just glanced at.

### What The Page Is For { data-toc-label="What The Page Is For" }

The main function of the Charts page is to let you compare time-based data in a way that would be awkward everywhere else in the WebUI. Logs are excellent when you need exact events or exact error messages, but they are not ideal when you want to understand trends. The System page is excellent for broad health information, but it is intentionally summarised and immediate. Charts sits between those two worlds. It gives you enough history to reason about change over time, but does so in a visual form that is fast to read and easy to compare.

This becomes especially valuable when you are trying to answer questions such as whether a value drifted, whether something peaked at a certain time, or whether two different signals moved together. Even when the underlying data already exists elsewhere in Allsky, the page often makes it easier to interpret because it puts that data into a consistent time-based view.

The page is also useful because it does not force you into a single fixed dashboard. Instead, it lets you choose which charts belong together. You can build one tab that acts as a high-level overview, another that focuses on a narrower technical area, and another that exists only for experimentation. That flexibility is an important part of the page’s function. It is not trying to dictate one “correct” set of graphs for every user. It is giving you a place to build the views that are actually useful for your own installation.

### Understanding The Header Controls { data-toc-label="Understanding Header" }

The header controls in the top-right corner are small, but each one changes the way you work with the page.

=== "Time Range"

    The clock button controls the **global time range** for the workspace. This is one of the most important ideas on the page. Rather than setting the visible period separately for each chart, the page lets you choose a shared time window and apply it across the workspace. That means every chart can be looking at the same stretch of time, which makes comparison much easier.

    This is particularly useful when you are trying to line up cause and effect. If two charts are both showing the same six-hour or twenty-four-hour period, it is much easier to see whether a change in one lines up with a change in the other. The button supports quick ranges for common cases as well as explicit start and end times when you need to inspect a specific incident more carefully.

=== "Custom Chart"

    The plus button opens the **custom chart editor**. This is not for adding an existing chart from the chart list. It is for creating a brand new chart definition of your own. That distinction matters. If you simply want to place one of the built-in or already saved charts onto the page, you use the chart menu and drag it into a tab. If you want to design a new chart, change which variables are used, or create a more specialised graph that does not already exist, the plus button is the starting point.

=== "Options"

    The gear button opens the **chart manager options**. These settings affect how the workspace behaves rather than what data is shown. This is where you control whether a visible grid is used, how large that grid is, how charts snap when they are moved, and what default auto-refresh rate new charts should use.

    These settings sound cosmetic at first, but they have a practical effect on how comfortable the page is to use. Some people prefer a very tidy layout where charts align neatly on a grid. Others prefer a looser arrangement. The options dialog lets you choose the style of layout management that suits you.

=== "Chart Menu"

    The menu button opens the **available charts** panel. This is where the existing chart library lives. The panel groups charts by category, which makes it easier to browse when the number of available charts grows. It is also where custom charts appear after you save them, so the menu becomes the main library for both built-in and user-created graphs.

![](/assets/using_images/charts_available_charts.png){ width="100%" }

/// caption
Placeholder: Available charts side panel
///

### Adding A Chart To The Workspace { data-toc-label="Adding Chart Workspace" }

The normal way to add a chart is simple, but it helps to understand the flow clearly. First, open the chart menu so the available chart categories are visible. Then choose the tab you want to work in. Finally, drag the chart entry from the side panel into the active tab area. Once dropped, the chart is created inside that tab and becomes part of its saved layout.

This is worth spelling out because there are really two different actions on the page that can both feel like “adding a chart.” Dragging from the chart menu adds an **existing** chart definition to the workspace. Using the plus button creates a **new custom chart definition**. They are related, but they are not the same operation.

!!! tip "A good way to start"

    If you are new to the page, begin with one tab and only a small number of charts. Arrange them until the page feels comfortable, then add more only when you know what question each one is helping answer. Charts are most useful when each graph earns its place.

Once a chart has been added, it can be moved and resized. That matters because some charts deserve more visual space than others. A chart you are studying closely may need to be large enough to show detail clearly, while another chart may only be there for rough context and can stay much smaller. The page is designed with that freedom in mind, so you should treat the workspace as something you can shape rather than something you have to accept as fixed.

??? example "Typical workflow for adding and arranging charts"

    A very common pattern is to set the time range first, then add two or three related charts to a tab, then resize them so they can be compared at a glance. After that, you may create another tab for a different topic. Over time, the page becomes less like a blank canvas and more like a set of reusable dashboards tailored to your own system.

### Working With Tabs { data-toc-label="Working With Tabs" }

Tabs exist so that the page can hold several different chart layouts without forcing them all into one crowded view. The default page begins with a Home tab, but you can create more, switch between them, rename them, and close them when they are no longer needed. This is useful because a single chart layout is rarely enough once you begin using the page seriously.

One tab might hold broad system-level charts that you want to glance at regularly. Another might be dedicated to a particular investigation. Another might contain experimental or custom charts that you only use occasionally. The advantage of tabs is not merely organisational neatness. It is that they let each workspace stay readable. Instead of building one overloaded dashboard that becomes visually noisy, you can create several cleaner views with more obvious purpose.

The page also remembers these layouts. That persistence is important. It means the time spent arranging the page is not wasted. Once you have built a tab structure that suits your installation, you can keep using it as your normal working environment rather than having to reconstruct it every time you visit.

### Time Range And Comparison { data-toc-label="Time Range Comparison" }

The global time range is one of the features that gives the page most of its analytical value. Because the same range is pushed to the charts in the workspace, you can compare signals over the same period without constantly adjusting each graph by hand. That makes the page much better at showing relationships between variables.

![](/assets/using_images/charts_time_range.png){ width="100%" }

/// caption
Placeholder: Charts time-range chooser
///

Quick ranges are useful when you want to move quickly between common windows such as the last hour, last day, or last week. Explicit start and end times become more useful when you are investigating a known event and want to isolate that period precisely. Both approaches are valid. The important thing is that the selected range belongs to the page as a whole, not just to one individual chart.

!!! note

    When you change the global time range, the charts reload against that new period. If the workspace contains several charts, that may take a moment because the page is asking each one to refresh its data. That behaviour is expected and is part of keeping the workspace consistent.

### Auto-Refresh And Live Monitoring { data-toc-label="Auto-Refresh Live" }

Although charts are often used for historical analysis, they can also act as a live monitoring surface. Each chart can refresh automatically, which allows the graph to keep moving forward as new data arrives. This means the page can sit somewhere between a static report and a live dashboard. If you want to monitor behaviour while also keeping recent history visible, this feature is often exactly what makes the page useful.

The default auto-refresh rate for newly created charts is controlled from the options dialog, but individual charts can keep their own refresh settings. That is a practical design choice. Not every graph benefits from updating at the same rate. Some charts are better treated as stable references, while others are more useful when they update frequently.

### The Options Dialog In Detail { data-toc-label="The Options Dialog" }

The options dialog affects the behaviour of the chart manager rather than the data itself. That distinction is important because these settings are about how the workspace feels and behaves while you arrange charts.

/// details | Grid enabled

When grid mode is enabled, the tab background shows a layout grid and charts can snap against it. This makes the workspace feel much more structured and is useful if you want a clean, aligned dashboard rather than a free-form arrangement.

///

/// details | Grid size

The grid size controls the spacing of that layout grid. A smaller value gives you finer control but can make alignment feel fussier. A larger value encourages bigger, cleaner blocks and can make the page easier to keep tidy.

///

/// details | Drag snap type

This controls whether charts snap only when you release them or whether they snap while you are dragging. Neither behaviour is inherently better. Snapping while moving can feel precise and immediate, while snapping at the end can feel less intrusive when you are experimenting with positions.

///

/// details | Default auto-refresh

This is the refresh interval that newly added charts start with. It does not rewrite every existing chart. Instead, it sets a sensible default for charts created after the setting is changed.

///

These controls are easy to overlook, but they can make a noticeable difference to how usable the page feels. If the workspace seems messy or difficult to manage, the options dialog is often the right place to improve the experience.

### Custom Charts In More Detail { data-toc-label="Custom Charts More" }

Custom charts are where the page becomes more than a viewer for predefined graphs. The custom chart editor allows you to define a chart of your own and save it back into the chart library. Once saved, it behaves like any other available chart entry and can be dragged into tabs whenever you want to use it.

![](/assets/using_images/charts_custom_chart_editor.png){ width="100%" }

/// caption
Placeholder: Custom chart editor
///

This matters because the built-in charts cannot predict every combination of data that every installation will care about. Some users want a graph that focuses on a narrow technical area. Others want a comparison chart that combines values in a way the default set does not. Some may simply want a clearer or more specialised presentation for a particular recurring task. The custom chart editor exists to fill that gap.

At a practical level, the process works like this. You open the editor with the plus button, configure the chart you want, give it a meaningful title, and save it. Once saved, it appears in the available charts panel. From that point on, it can be added to a tab in exactly the same way as any built-in chart. If you later decide the chart needs improvement, the chart library provides edit and delete actions for saved custom charts.

!!! warning "Saving a custom chart does not place it on the page automatically"

    Saving creates or updates the chart definition in the library. You still add it to a workspace by opening the chart menu and dragging that saved chart into a tab. This separation is useful because it lets you save a chart definition once and reuse it in multiple layouts later.

The most important thing when creating a custom chart is to know what question the chart is meant to answer. A chart built around a clear question is usually much more effective than one built simply because a lot of variables are available. In other words, it is usually better to create a chart that tells one coherent story than one that tries to show everything at once.

??? question "When should you create a custom chart?"

    A custom chart is usually the right choice when the data you want already exists, but the available built-in charts do not present it in the combination or style that you need. If an existing chart already answers the question well, it is usually better to use that. If not, a custom chart gives you a way to define your own view rather than forcing your question to fit the default library.

Because custom charts become part of the available chart list, they can gradually turn the Charts page into a much more personal tool. Over time, many users will end up with a small set of custom charts that reflect the parts of their own installation they care about most. That is one of the reasons this page can become so valuable. It adapts to the system instead of forcing the system into one fixed dashboard model.

### Built-In And Custom Charts Together { data-toc-label="Built-In Custom Charts" }

One of the strengths of the page is that built-in and custom charts are not separated into different worlds. Once a custom chart has been saved, it joins the same chart library and the same drag-and-drop workflow as everything else. That makes the page feel coherent. You do not need one mental model for stock charts and another for your own charts. The difference is only in where the chart definition came from.

This also means you can mix them freely inside one tab. A built-in chart can provide context, while a custom chart focuses on the specific relationship you care about. That combination is often much more useful than relying only on one type or the other.

### Making The Most Of The Page { data-toc-label="Making Most Page" }

The Charts page is most useful when you approach it with intent. If you open it only to scatter charts around, it can quickly become noisy. If you open it with a question in mind, it becomes much more powerful. Decide what you want to compare, pick the time range that matters, add only the charts that support that question, and then arrange them so the comparison is easy to read.

Over time, this page tends to become one of the most revealing parts of the WebUI. It will not replace logs, and it will not replace the status pages, but it often explains behaviour that those pages can only hint at. That is the real function of the Charts page: to give you a way to see change, compare signals, and build visual views that match the way you actually investigate your Allsky system.
