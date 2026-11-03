# Bootstrap Command-Line Integration

go-wind-bootstrap ships with built-in [Cobra](https://github.com/spf13/cobra) command-line support: the application itself is a Cobra root command that specifies the configuration file via the `-c` flag — out of the box.

## 1. One-Line Cobra Integration

```go
package main

import (
    "os"

    bootstrap "github.com/tx7do/go-wind-bootstrap"
)

func main() {
    if err := bootstrap.RunAppWithFlags(bootstrap.NewCommandFlags()); err != nil {
        os.Exit(1)
    }
}
```

`RunAppWithFlags` creates the Cobra root command, parses flags, loads the configuration, and starts the application — internally equivalent to `RunApp(flags.Conf)`.

## 2. Command-Line Flags

| Flag | Description |
|------|------|
| `-c, --conf` | Configuration file path (yaml/json/bin), default `config.yaml` |

```bash
# Use the default config.yaml
go run main.go

# Specify a configuration file
go run main.go -c /path/to/config.yaml
go run main.go --conf config.json
```

The configuration file format is auto-detected by extension: `.yaml` / `.yml` → YAML, `.json` → JSON, `.bin` / `.pb` → Protobuf binary.

## 3. Extending the Root Command

`RunAppWithFlags` accepts an optional command customization function for adding subcommands, extra flags, or modifying command metadata:

```go
flags := bootstrap.NewCommandFlags()

if err := bootstrap.RunAppWithFlags(flags, func(root *cobra.Command) {
    root.Use = "my-service"
    root.Short = "Order service"

    // Add a custom subcommand
    root.AddCommand(&cobra.Command{
        Use:   "migrate",
        Short: "Run database migrations",
        RunE: func(cmd *cobra.Command, args []string) error {
            // Migration logic (flags.Conf can be reused to read the same configuration)
            return nil
        },
    })
}); err != nil {
    os.Exit(1)
}
```

For finer-grained control, use the lower-level building blocks directly:

```go
// CommandFlags: the CLI flag set (Conf holds the configuration path)
flags := bootstrap.NewCommandFlags()

// NewRootCmd: creates the standard root command; runE is called after flags are parsed
root := bootstrap.NewRootCmd(flags, func(cmd *cobra.Command, args []string) error {
    return bootstrap.RunApp(flags.Conf)
})

// AddFlags: binds -c/--conf to your own cobra command
flags.AddFlags(myCmd)

return root.Execute()
```

## 4. Specifying Configuration Programmatically

When not going through the command line, call the sealed entry points directly:

```go
// One-line startup: load configuration + signal listening + run + cleanup
if err := bootstrap.RunApp("config.yaml"); err != nil {
    log.Fatal(err)
}

// Load the configuration object first, process it yourself, then run
cfg, err := bootstrap.LoadConfigFromFile("config.yaml")
if err != nil {
    log.Fatal(err)
}
if err := bootstrap.Run(context.Background(), cfg); err != nil {
    log.Fatal(err)
}
```

## Related Documentation

- [Bootstrap Introduction](./bootstrap-intro.md)
- [The Bootstrap Configuration System](./bootstrap-config.md)
- [Bootstrap Practical Examples](./bootstrap-examples.md)
- [Quick Start Tutorial](./tutorial-quick-start.md)
