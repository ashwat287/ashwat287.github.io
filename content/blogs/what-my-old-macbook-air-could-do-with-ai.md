# I Wanted to Know What My Old MacBook Air Could Do with AI, So I Built ModelGauge

*An old Macbook Air and a small tool for asking the same questions of your own hardware.*

![A MacBook Air running ModelGauge dashboards beside a closed MacBook and a copy of A Fine Balance](/images/modelgauge-macbook.jpg)

### Why I started
I had an old Intel MacBook Air with 8 GB of memory sitting around, and I kept wondering what it could really do with AI. Not what a spec sheet says, but what it would feel like to use. How long would I wait for an answer? How much memory would a model actually need? Would changing a setting make a difference I could notice?

Most of what I found assumed a GPU, a newer machine, or a cloud bill. I just wanted answers about hardware I already owned. So I built [ModelGauge](https://github.com/ashwat287/modelGauge), a small open-source tool that benchmarks models on Linux and macOS machines, using Linux workspaces managed through Lima. It shows you what's happening while it runs and saves the results, so you can compare experiments later.

The MacBook is just where I happened to start. You can ask the same questions of a Linux desktop, a newer Mac, or any compatible machine you've already got.

I learned pretty quickly that getting a model to load doesn't tell you much. What I really wanted to know was which models I could use comfortably, and what I'd have to trade away to do it.

### How the idea took shape
At first I did everything by hand: typing commands, changing settings, saving output files. I tried different compressed versions of a model, longer and shorter prompts, and different amounts of CPU parallelism.

It worked, but keeping track of it all took more attention than I expected. To compare two results, I had to remember exactly what I'd done to get each one. At one point I was just checking an experiment's status over and over, waiting for it to finish.

Then there were the runs that started fast and slowed down. Some repeated measurements landed close together, and others drifted. I learned to be a little suspicious of a good first number. Before I believe one now, I run the test again and see whether it holds up.

That's when a pile of scripts turned into a tool. I wanted to start a run, follow it in one place, and have every result saved alongside what produced it.

If you try this yourself, the one thing I'd suggest is changing one thing at a time. You learn much more from giving two settings the same work than from changing the model, the input length, and the CPU settings all at once and trying to explain the difference afterward. That's the habit I wanted ModelGauge to make easier.

And if you've got a Linux or macOS machine you're curious about, start with a small model, give it some work, and see how it behaves. The setup guide covers the hardware and virtualization requirements.

### What ModelGauge does now
It works through one model's tests in order and shows progress in your terminal. A dashboard opens while it runs. When the tests finish, it keeps watching the machine for another minute, then stops collecting. You can still open the finished dashboard and export your results.

The idea is to make it easier to finish an experiment, look at what happened, and decide what's worth trying next.

### How it's put together
There are two jobs here: running the experiment and doing the model work. You can split them across two machines, or use one if it has enough resources. I use a separate controller machine to manage the experiment, which keeps the monitoring work off the machine I'm measuring.

Behind that are two Linux workspaces. They're virtual machines, each with its own resource budget. The control workspace holds the controller, which prepares and supervises the experiment and saves the results. It also hosts Prometheus to collect measurements and Grafana to turn them into the graphs you see in your browser.

The benchmark workspace is where the model runs. In a two-machine setup, ModelGauge reaches it over SSH, a secure network connection. The controller prepares that workspace and sends it the experiment to carry out.

Here's how the pieces fit together in the remote setup:

```
MACHINE MANAGING THE EXPERIMENT
  Choose a model and an experiment
                  |
                  v
  Control workspace
    Prepare and supervise the run
    Save the results
    Collect measurements and show dashboards
                  |
                  | Secure network connection (SSH)
                  v
MACHINE RUNNING THE MODEL
  Host operating system + VM manager
                  |
                  v
  Linux benchmark workspace
    Model + detailed experiment files
    Temporary worker:
      First: test model speed and memory
      Then: test request/response behavior
                  |
                  +-- Progress and measurements
                      return to the control workspace
```

For a remote macOS host, you give ModelGauge SSH access and it installs a private copy of Lima and prepares the benchmark VM. That automatic remote setup only targets macOS for now. Local Lima-based setups also work on Linux, and both workspaces can live on one supported Linux or macOS machine if it has enough memory.

The tests run one after another. The direct model test finishes before the request tests start, so they never compete with each other. The worker is temporary too, so there's no ModelGauge agent that has to keep running on the machine you're testing.

There's a limit to what this separation gives you, though. The host operating system and the benchmark VM still share the machine's physical resources, so I read the numbers as measurements of the model inside that workspace, with the host's other activity still part of the picture.

Getting my remote setup working took a few attempts. I ran into an older installed copy of the tool, a mistake in the generated VM configuration, and an intermittent SSH timeout that happened before authentication even started. Those problems ended up being part of testing the tool: what would someone else run into, and would the error help them understand it?

I've now gone through the full remote flow successfully: prepare the workspace, install a model, run the experiment, watch the dashboard, and export the results.

### A first complete run
For that first full run I used SmolLM2-135M Instruct. The compressed download is only about 105 MB, which made it a convenient way to check the whole process before moving on to bigger models.

I gave the benchmark VM two virtual CPUs and 3 GiB of memory. Everything ran on the CPU, with no GPU acceleration. Then I compared one CPU thread with two, which is basically a way of asking how much parallel CPU work the model can use.

Here's what came back:

| Observation | One CPU thread | Two CPU threads |
|---|---:|---:|
| Text-generation speed in the direct test | About 65 tokens/second | About 107 tokens/second |
| Average wait before the first output in the request test | 0.69 seconds | 0.48 seconds |
| Average time to finish the capped short response | 1.23 seconds | 0.83 seconds |

A token is a small piece of text, often part of a word. Please don't read those rates as words per second, but they're handy for comparing runs.

In the direct generation test, two threads produced about 63% more output per second. In the separate request test, the average time to finish the short response dropped by roughly a third.

The waiting times are the numbers I relate to most. If you're using an assistant, you feel the pause before it starts replying. If you need the whole answer before your next step, you care about when it finishes too. Both are worth measuring.

One thing to keep in mind: the request tests ran right beside the model inside the benchmark VM, so those times don't include any extra delay over the network between the two machines.

![ModelGauge dashboard showing SmolLM2 prompt-processing and text-generation speeds with one and two CPU threads](https://raw.githubusercontent.com/ashwat287/modelGauge/db59fe6c09d50c1bef047fc030e0e9d145fc87fc/docs/images/grafana-throughput.png)

*Same model, different settings. The flat sections keep the measured results visible. They don't mean the model was generating text the whole time.*

The separate memory test measured a peak of about 144 MiB for the benchmark process. ModelGauge suggested setting aside about 181 MiB, which adds a little room on top of what it measured.

That answers a question the download size can't: how much room does the model need when it's actually doing work?

It's still only part of the memory picture. The operating systems and other processes need space too, and I'd check again before assuming the same allowance would cover longer inputs or several people making requests.

![ModelGauge dashboard showing measured peak process memory and a suggested reservation with additional headroom](https://raw.githubusercontent.com/ashwat287/modelGauge/db59fe6c09d50c1bef047fc030e0e9d145fc87fc/docs/images/grafana-memory-baseline.png)

*The measured memory peak, plus an estimate with some extra room. Neither is the total memory the computer is using.*

### What this does and doesn't tell me
I'm trying to be careful about how much I read into this run. The direct tests used three measured repetitions. The request tests sent three requests per setting, with 128-token inputs and outputs capped at 32 tokens. All six measured requests finished with no reported errors.

That's enough for a first check that the workflow works. It doesn't tell me how the setup would cope with a long session or a lot of users, and it says nothing about whether the model's answers are any good. Before choosing a model for a real task, I'd still try it on representative prompts and read what it writes.

What I have now is an experiment I can repeat. I can give a larger model the same work and see what changes. I can keep the model and make the input longer. I can leave it running longer and see whether the early numbers still describe the experience later on.

That's the part I find most interesting: finding a useful job for a model on a particular machine, and understanding the tradeoffs well enough to make a sensible choice.

### Try it, break it, improve it
ModelGauge is still a small project. The benchmark work happens in Linux, and it uses models in a file format called GGUF. My results come from one particular setup, and there are plenty of Linux and macOS machines and workloads I haven't tried. If you experiment with it, you'll probably find questions I've missed.

You're welcome to fork it and have a go. Start with the small example, watch the graphs, and change one setting. Keep your results so you've got something to compare against next time.

You don't need a big feature idea to contribute. If a setup step confuses you, tell me where you got stuck. If a graph is hard to understand, tell me what you expected it to show. A model comparison, a reproducible bug, a clearer explanation, or a missing measurement can all help. So can work that lets the tool reach more hardware.

I'd especially like to hear when a result looks promising but your application still feels slow. That's worth looking into. It might mean I'm measuring the wrong thing for your use, or that I need to explain a measurement better.

The [repository and setup guide are on GitHub](https://github.com/ashwat287/modelGauge). You can fork ModelGauge, open an issue, or send a pull request.

If you try it, tell me what happened. I'd love to compare notes.
