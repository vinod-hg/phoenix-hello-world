defmodule Hello.Room do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:name, :string, []}
  @derive {Phoenix.Param, key: :name}
  schema "rooms" do
    field :data, :binary
    field :users, :string

    timestamps()
  end

  @doc false
  def changeset(room, attrs) do
    room
    |> cast(attrs, [:name, :users, :data])
    |> validate_required([:name, :users, :data])
  end
end
