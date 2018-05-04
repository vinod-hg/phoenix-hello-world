defmodule Hello.Repo.Migrations.CreateRooms do
  use Ecto.Migration

  def change do
    create table(:rooms, primary_key: false) do
      add :name, :string, primary_key: true
      add :users, :string
      add :data, :binary

      timestamps()
    end

  end
end
